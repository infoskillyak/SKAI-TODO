import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Plan } from '@prisma/client';

@Injectable()
export class BillingService {
  constructor(private prisma: PrismaService) {}

  async getOrgBilling(orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        _count: {
          select: { users: true, tasks: true } as any,
        },
      },
    }) as any;

    if (!org) {
      throw new HttpException('Organization not found', HttpStatus.NOT_FOUND);
    }

    const limits = this.getPlanLimits(org.billingPlan);
    
    return {
      plan: org.billingPlan,
      usage: {
        users: org._count.users,
        tasks: org._count.tasks,
      },
      limits,
    };
  }

  async updatePlan(orgId: string, plan: Plan) {
    const org = await this.prisma.organization.update({
      where: { id: orgId },
      data: { billingPlan: plan },
    });

    // Sync all users in the org to the same plan
    await this.prisma.user.updateMany({
      where: { orgId },
      data: { plan },
    });

    return org;
  }

  private getPlanLimits(plan: Plan) {
    switch (plan) {
      case 'FREE':
        return { maxUsers: 2, maxTasks: 50, aiCredits: 5 };
      case 'PRO':
        return { maxUsers: 5, maxTasks: 500, aiCredits: 100 };
      case 'TEAM':
        return { maxUsers: 20, maxTasks: 5000, aiCredits: 1000 };
      case 'ENTERPRISE':
        return { maxUsers: 1000, maxTasks: 1000000, aiCredits: 10000 };
      default:
        return { maxUsers: 2, maxTasks: 50, aiCredits: 5 };
    }
  }

  async checkLimit(orgId: string, type: 'users' | 'tasks') {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        _count: {
          select: { users: true, tasks: true },
        },
      },
    });

    if (!org) return false;

    const limits = this.getPlanLimits(org.billingPlan);
    if (type === 'users' && org._count.users >= limits.maxUsers) return false;
    if (type === 'tasks' && org._count.tasks >= limits.maxTasks) return false;

    return true;
  }
}
