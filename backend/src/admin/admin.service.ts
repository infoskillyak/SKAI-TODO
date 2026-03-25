import { Injectable, OnModuleInit, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SystemConfig, Role, Plan } from '@prisma/client';
import axios from 'axios';

@Injectable()
export class AdminService implements OnModuleInit {
  constructor(private prisma: PrismaService) { }

  async onModuleInit() {
    // Initialize global config if it doesn't exist
    const config = await this.prisma.systemConfig.findUnique({
      where: { id: 'global_config' },
    });

    if (!config) {
      await this.prisma.systemConfig.create({
        data: { id: 'global_config' },
      });
    }
  }

  // ==================== System Configuration ====================

  async getConfig(): Promise<SystemConfig | null> {
    return this.prisma.systemConfig.findUnique({
      where: { id: 'global_config' },
    });
  }

  async updateConfig(data: Partial<SystemConfig>): Promise<SystemConfig> {
    return this.prisma.systemConfig.update({
      where: { id: 'global_config' },
      data,
    });
  }

  // ==================== Plan Pricing Management ====================

  async getPlanPricing(): Promise<any[]> {
    return this.prisma.planPricing.findMany({
      orderBy: { monthlyPrice: 'asc' },
    });
  }

  async updatePlanPricing(plan: Plan, data: {
    monthlyPrice?: number;
    yearlyPrice?: number;
    maxUsers?: number;
    maxTasks?: number;
    features?: string[];
  }): Promise<any> {
    const existing = await this.prisma.planPricing.findUnique({
      where: { plan },
    });

    if (existing) {
      return this.prisma.planPricing.update({
        where: { plan },
        data,
      });
    } else {
      // Create new plan pricing
      return this.prisma.planPricing.create({
        data: {
          plan,
          monthlyPrice: data.monthlyPrice || 0,
          yearlyPrice: data.yearlyPrice || 0,
          maxUsers: data.maxUsers || 1,
          maxTasks: data.maxTasks || -1,
          features: data.features || [],
        },
      });
    }
  }

  async deletePlanPricing(plan: Plan): Promise<any> {
    return this.prisma.planPricing.delete({
      where: { plan },
    });
  }

  // ==================== Organization Management ====================

  async createOrganization(data: { name: string; id?: string; adminId?: string }): Promise<any> {
    const org = await this.prisma.organization.create({
      data: {
        id: data.id || `org_${Date.now()}`,
        name: data.name,
        adminId: data.adminId || 'placeholder-admin',
      },
    });
    return org;
  }

  async getOrganizations(): Promise<any[]> {
    return this.prisma.organization.findMany({
      include: {
        _count: {
          select: { users: true }
        }
      }
    });
  }

  async updateOrganization(id: string, data: { name?: string; billingPlan?: string }): Promise<any> {
    try {
      return await this.prisma.organization.update({
        where: { id },
        data: {
          name: data.name,
          billingPlan: data.billingPlan as any,
        },
      });
    } catch (error: any) {
      console.error('Error updating organization:', error);
      throw new HttpException(error.message || 'Failed to update organization', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async deleteOrganization(id: string): Promise<any> {
    // First, get all users in the organization
    const users = await this.prisma.user.findMany({
      where: { orgId: id },
      select: { id: true },
    });
    const userIds = users.map(u => u.id);

    // Delete related data for each user (cascade should handle this, but being explicit)
    // Delete calendar events
    await this.prisma.calendarEvent.deleteMany({
      where: { orgId: id },
    });

    // Delete AI usage credits
    await this.prisma.aiUsageCredit.deleteMany({
      where: { userId: { in: userIds } },
    });

    // Delete all users in the organization
    await this.prisma.user.deleteMany({
      where: { orgId: id },
    });

    // Then delete the organization
    return this.prisma.organization.delete({
      where: { id },
    });
  }

  // ==================== User Management ====================


  async createUser(data: {
    email: string;
    name: string;
    orgId: string;
    password?: string;
    role?: Role;
    plan?: Plan;
  }): Promise<any> {
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new HttpException('User already exists', HttpStatus.BAD_REQUEST);
    }

    const { password, ...rest } = data;
    const bcrypt = require('bcrypt');
    const salt = await bcrypt.genSalt();
    const hash = await bcrypt.hash(password || 'password123', salt);

    const user = await this.prisma.user.create({
      data: {
        ...rest,
        passwordHash: hash,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...result } = user;
    return result;
  }

  async getUsers(params: {
    skip?: number;
    take?: number;
    role?: Role;
    plan?: Plan;
    search?: string;
    requestingUser: any;
  }): Promise<{ users: any[]; total: number }> {
    const { skip = 0, take = 50, role, plan, search, requestingUser } = params;

    const where: any = {};

    // Scoping: If not SUPERADMIN, only show users from their own organization
    if (requestingUser.role !== (Role as any).SUPERADMIN) {
      where.orgId = requestingUser.orgId;
    }

    if (role) where.role = role;
    if (plan) where.plan = plan;
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          plan: true,
          orgId: true,
          stripeCustomerId: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              tasksCreated: true,
              tasksAssigned: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    // Transform to include computed fields
    const transformedUsers = users.map((u) => ({
      ...u,
      tasksCompleted: u._count.tasksCreated + u._count.tasksAssigned,
      status: 'active', // Would need lastLogin field for real implementation
    }));

    return { users: transformedUsers, total };
  }

  async getUser(id: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        organization: true,
        _count: {
          select: {
            tasksCreated: true,
            tasksAssigned: true,
            aiUsageCredits: true,
          },
        },
      },
    });

    if (!user) {
      throw new HttpException(`User with ID ${id} not found`, HttpStatus.NOT_FOUND);
    }

    return {
      ...user,
      tasksCompleted: user._count.tasksCreated + user._count.tasksAssigned,
      status: 'active',
    };
  }

  async updateUser(id: string, data: {
    name?: string;
    role?: Role;
    plan?: Plan;
    orgId?: string | null;
  }): Promise<any> {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new HttpException(`User with ID ${id} not found`, HttpStatus.NOT_FOUND);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        plan: true,
        updatedAt: true,
      },
    });

    return { success: true, user };
  }

  async deleteUser(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const user = await this.prisma.user.findUnique({ where: { id } });
      if (!user) {
        throw new HttpException(`User with ID ${id} not found`, HttpStatus.NOT_FOUND);
      }

      // First, delete user's calendar events
      await this.prisma.calendarEvent.deleteMany({
        where: { userId: id },
      }).catch(() => { });

      // Delete AI usage credits
      await this.prisma.aiUsageCredit.deleteMany({
        where: { userId: id },
      }).catch(() => { });

      // Check if user has created tasks - soft delete
      const taskCount = await this.prisma.task.count({
        where: { createdBy: id },
      });

      if (taskCount > 0) {
        // Soft delete - anonymize the user
        await this.prisma.user.update({
          where: { id },
          data: { email: `deleted_${Date.now()}_${user.email}` },
        });
        return { success: true, message: 'User deactivated (had existing tasks)' };
      }

      await this.prisma.user.delete({ where: { id } });
      return { success: true, message: 'User deleted successfully' };
    } catch (error: any) {
      console.error('Error deleting user:', error);
      throw new HttpException(error.message || 'Failed to delete user', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ==================== Statistics ====================

  async getStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    usersByPlan: { plan: string; count: number }[];
    usersByRole: { role: string; count: number }[];
    mrr: number;
  }> {
    const [totalUsers, usersByPlan, usersByRole] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.groupBy({
        by: ['plan'],
        _count: { plan: true },
      }),
      this.prisma.user.groupBy({
        by: ['role'],
        _count: { role: true },
      }),
    ]);

    // Calculate MRR
    const planPrices: Record<Plan, number> = {
      FREE: 0,
      PRO: 9.99,
      TEAM: 29.99,
      ENTERPRISE: 99.99,
    };

    const mrr = usersByPlan.reduce((total, item) => {
      return total + (planPrices[item.plan] || 0) * item._count.plan;
    }, 0);

    return {
      totalUsers,
      activeUsers: totalUsers,
      usersByPlan: usersByPlan.map((item) => ({
        plan: item.plan,
        count: item._count.plan,
      })),
      usersByRole: usersByRole.map((item) => ({
        role: item.role,
        count: item._count.role,
      })),
      mrr,
    };
  }

  // ==================== n8n Integration ====================

  async testN8nConnection(baseUrl: string, apiKey: string): Promise<{ success: boolean; message: string }> {
    try {
      // Normalize URL
      const normalizedUrl = baseUrl.replace(/\/$/, '');

      // Try to fetch n8n info endpoint
      const response = await axios.get(`${normalizedUrl}/rest`, {
        headers: apiKey ? { 'X-N8N-API-KEY': apiKey } : {},
        timeout: 10000,
      });

      if (response.status === 200) {
        return { success: true, message: 'Connected to n8n successfully' };
      }

      return { success: false, message: 'Unexpected response from n8n' };
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        return { success: false, message: 'Could not connect to n8n server' };
      }
      if (error.response?.status === 401) {
        return { success: false, message: 'Invalid n8n API key' };
      }
      return { success: false, message: `Connection failed: ${error.message}` };
    }
  }

  // ==================== Payment Gateway Testing ====================

  async testPaymentGateway(
    gateway: 'stripe' | 'razorpay',
    credentials: any
  ): Promise<{ success: boolean; message: string }> {
    if (gateway === 'stripe') {
      try {
        const Stripe = require('stripe');
        const stripe = new Stripe(credentials.secretKey);
        await stripe.balance.retrieve();
        return { success: true, message: 'Stripe connection successful' };
      } catch (error: any) {
        return { success: false, message: `Stripe error: ${error.message}` };
      }
    } else if (gateway === 'razorpay') {
      try {
        const razorpay = require('razorpay');
        const instance = new razorpay({
          key_id: credentials.keyId,
          key_secret: credentials.keySecret,
        });
        // Try to fetch account info
        await instance.payments.all({ count: 1 });
        return { success: true, message: 'Razorpay connection successful' };
      } catch (error: any) {
        return { success: false, message: `Razorpay error: ${error.message}` };
      }
    }

    return { success: false, message: 'Unknown payment gateway' };
  }
}
