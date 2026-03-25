import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, User, Role, Plan } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) { }

  async findOneByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  // ==================== SuperAdmin User Management ====================

  /**
   * Find all users (with pagination and filters)
   */
  async findAll(params: {
    skip?: number;
    take?: number;
    role?: Role;
    plan?: Plan;
    search?: string;
  }): Promise<{ users: any[]; total: number }> {
    const { skip = 0, take = 50, role, plan, search } = params;

    const where: Prisma.UserWhereInput = {};

    if (role) {
      where.role = role;
    }

    if (plan) {
      where.plan = plan;
    }

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

    return { users, total };
  }

  /**
   * Find a single user by ID
   */
  async findOne(id: string): Promise<User> {
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
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  /**
   * Update user (for SuperAdmin - can change role, plan, etc.)
   */
  async update(id: string, data: {
    name?: string;
    role?: Role;
    plan?: Plan;
    orgId?: string | null;
  }): Promise<User> {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete a user (Soft delete preferred in production)
   */
  async remove(id: string): Promise<{ success: boolean; message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Check if user has created tasks
    const taskCount = await this.prisma.task.count({
      where: { createdBy: id },
    });

    if (taskCount > 0) {
      // Instead of hard delete, deactivate the user
      await this.prisma.user.update({
        where: { id },
        data: { email: `deleted_${Date.now()}_${user.email}` },
      });
      return { success: true, message: 'User deactivated (had existing tasks)' };
    }

    await this.prisma.user.delete({ where: { id } });
    return { success: true, message: 'User deleted successfully' };
  }

  /**
   * Get user statistics for admin dashboard
   */
  async getStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    usersByPlan: { plan: Plan; count: number }[];
    usersByRole: { role: Role; count: number }[];
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

    // Calculate MRR (Monthly Recurring Revenue)
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
      activeUsers: totalUsers, // Would need lastLogin tracking for accurate count
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

  /**
   * Update user plan (for billing integration)
   */
  async updatePlan(userId: string, plan: Plan, stripeCustomerId?: string): Promise<User> {
    const data: Prisma.UserUpdateInput = { plan };

    if (stripeCustomerId) {
      data.stripeCustomerId = stripeCustomerId;
    }

    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  /**
   * Find user by Stripe customer ID
   */
  async findByStripeCustomerId(stripeCustomerId: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { stripeCustomerId },
    });
  }
}
