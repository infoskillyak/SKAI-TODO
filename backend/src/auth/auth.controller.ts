import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Req, Delete, Get, Patch, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';
import { Role } from '@prisma/client';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(user);
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  // Self-delete account
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER, Role.ADMIN, Role.SUPERADMIN)
  @Delete('account')
  async deleteAccount(@Req() req, @Body() body: { password: string }) {
    return this.authService.deleteAccount(req.user.id, body.password);
  }

  // Generate email verification token
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER, Role.ADMIN, Role.SUPERADMIN)
  @Post('verify-email/request')
  async requestEmailVerification(@Req() req) {
    return this.authService.generateVerificationToken(req.user.id);
  }

  // Verify email with token
  @Post('verify-email')
  async verifyEmail(@Body() body: { token: string }) {
    return this.authService.verifyEmail(body.token);
  }

  // Update password
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER, Role.ADMIN, Role.SUPERADMIN)
  @Patch('password')
  async updatePassword(@Req() req, @Body() body: { currentPassword: string; newPassword: string }) {
    return this.authService.updatePassword(req.user.id, body.currentPassword, body.newPassword);
  }

  // Connect OAuth provider
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER, Role.ADMIN, Role.SUPERADMIN)
  @Post('oauth/:provider/connect')
  async connectOAuth(@Req() req, @Body() body: { accessToken: string; refreshToken?: string }) {
    return this.authService.connectOAuth(req.user.id, req.params.provider, body);
  }

  // Disconnect OAuth provider
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER, Role.ADMIN, Role.SUPERADMIN)
  @Delete('oauth/:provider/disconnect')
  async disconnectOAuth(@Req() req) {
    return this.authService.disconnectOAuth(req.user.id, req.params.provider);
  }

  // Get connected OAuth providers
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER, Role.ADMIN, Role.SUPERADMIN)
  @Get('oauth/connected')
  async getConnectedProviders(@Req() req) {
    return this.authService.getConnectedProviders(req.user.id);
  }

}
