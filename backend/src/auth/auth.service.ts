import { Injectable, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Prisma, User } from '@prisma/client';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) { }

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findOneByEmail(email);
    if (user && await bcrypt.compare(pass, user.passwordHash)) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role, orgId: user.orgId };
    return {
      accessToken: this.jwtService.sign(payload),
      user,
    };
  }

  async register(data: any) {
    const existing = await this.usersService.findOneByEmail(data.email);
    if (existing) {
      throw new UnauthorizedException('User already exists');
    }
    const salt = await bcrypt.genSalt();
    const hash = await bcrypt.hash(data.password, salt);

    // Create a personal organization for the new user
    const orgName = data.name ? `${data.name}'s Workspace` : 'My Workspace';
    const organization = await this.prisma.organization.create({
      data: {
        name: orgName,
        adminId: '', // Will update after user creation
        billingPlan: 'FREE',
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...rest } = data;
    const createData: Prisma.UserCreateInput = {
      ...rest,
      name: data.name || data.email.split('@')[0],
      passwordHash: hash,
      role: 'USER',
      orgId: organization.id,
      organization: { connect: { id: organization.id } },
    };

    const newUser = await this.usersService.create(createData);

    // Update organization with adminId
    await this.prisma.organization.update({
      where: { id: organization.id },
      data: { adminId: newUser.id },
    });

    return this.login(newUser);
  }

  /**
   * Self-delete account (user deletes their own account)
   */
  async deleteAccount(userId: string, password: string): Promise<{ success: boolean; message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid password');
    }

    // Check if user has created tasks
    const taskCount = await this.prisma.task.count({
      where: { createdBy: userId },
    });

    if (taskCount > 0) {
      // Soft delete - anonymize user
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          email: `deleted_${Date.now()}_${user.email}`,
          name: 'Deleted User',
          passwordHash: randomBytes(32).toString('hex'),
        },
      });
      return { success: true, message: 'Account deactivated (had existing tasks)' };
    }

    await this.prisma.user.delete({ where: { id: userId } });
    return { success: true, message: 'Account deleted successfully' };
  }

  /**
   * Generate email verification token
   */
  async generateVerificationToken(userId: string): Promise<{ token: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } }) as any;
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email already verified');
    }

    const token = randomBytes(32).toString('hex');
    await this.prisma.user.update({
      where: { id: userId },
      data: { verificationToken: token } as any,
    });

    // In production, send email with verification link
    // For now, return the token (in production, send via email)
    return { token };
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
    const user = await this.prisma.user.findFirst({
      where: { verificationToken: token } as any,
    }) as any;

    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, verificationToken: null } as any,
    });

    return { success: true, message: 'Email verified successfully' };
  }

  /**
   * Update password
   */
  async updatePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const salt = await bcrypt.genSalt();
    const hash = await bcrypt.hash(newPassword, salt);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hash },
    });

    return { success: true, message: 'Password updated successfully' };
  }

  /**
   * Connect OAuth provider (Google, Outlook, Slack)
   */
  async connectOAuth(userId: string, provider: string, tokens: { accessToken: string; refreshToken?: string }): Promise<{ success: boolean }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updateData: any = {};
    switch (provider.toLowerCase()) {
      case 'google':
        updateData.googleAccessToken = tokens.accessToken;
        if (tokens.refreshToken) updateData.googleRefreshToken = tokens.refreshToken;
        break;
      case 'outlook':
        updateData.outlookAccessToken = tokens.accessToken;
        if (tokens.refreshToken) updateData.outlookRefreshToken = tokens.refreshToken;
        break;
      case 'slack':
        updateData.slackAccessToken = tokens.accessToken;
        break;
      default:
        throw new BadRequestException(`Unknown provider: ${provider}`);
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: updateData as any,
    });

    return { success: true };
  }

  /**
   * Disconnect OAuth provider
   */
  async disconnectOAuth(userId: string, provider: string): Promise<{ success: boolean }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updateData: any = {};
    switch (provider.toLowerCase()) {
      case 'google':
        updateData.googleAccessToken = null;
        updateData.googleRefreshToken = null;
        updateData.googleCalendarId = null;
        break;
      case 'outlook':
        updateData.outlookAccessToken = null;
        updateData.outlookRefreshToken = null;
        updateData.outlookCalendarId = null;
        break;
      case 'slack':
        updateData.slackAccessToken = null;
        updateData.slackTeamId = null;
        break;
      default:
        throw new BadRequestException(`Unknown provider: ${provider}`);
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: updateData as any,
    });

    return { success: true };
  }

  /**
   * Get connected OAuth providers
   */
  async getConnectedProviders(userId: string): Promise<{ google: boolean; outlook: boolean; slack: boolean }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } }) as any;
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      google: !!user.googleAccessToken,
      outlook: !!user.outlookAccessToken,
      slack: !!user.slackAccessToken,
    };
  }
}
