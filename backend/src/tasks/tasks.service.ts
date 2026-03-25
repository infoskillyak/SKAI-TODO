import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Task } from '@prisma/client';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) { }

  async findAllByOrg(orgId: string): Promise<Task[]> {
    return this.prisma.forTenant(orgId).task.findMany({
      include: {
        comments: true,
        subtasks: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, orgId: string): Promise<Task> {
    const task = await this.prisma.forTenant(orgId).task.findFirst({
      where: { id },
      include: { comments: true, subtasks: true },
    });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async create(data: any, userId: string, orgId: string): Promise<Task> {
    // If no orgId, get user's organization or create one
    let finalOrgId: string | null = orgId;
    if (!finalOrgId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { orgId: true },
      });

      // If still no orgId, create a default organization
      if (!user?.orgId) {
        const org = await this.prisma.organization.create({
          data: {
            name: 'Default Workspace',
            adminId: userId,
            billingPlan: 'FREE',
          },
        });
        await this.prisma.user.update({
          where: { id: userId },
          data: { orgId: org.id },
        });
        finalOrgId = org.id;
      } else {
        finalOrgId = user.orgId;
      }
    }

    const { creator, organization, ...rest } = data;
    return this.prisma.task.create({
      data: {
        ...rest,
        creator: { connect: { id: userId } },
        organization: { connect: { id: finalOrgId } },
      },
    });
  }

  async update(id: string, orgId: string, data: Prisma.TaskUpdateInput): Promise<Task> {
    const task = await this.prisma.forTenant(orgId).task.findFirst({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');

    return this.prisma.forTenant(orgId).task.update({
      where: { id },
      data,
    });
  }

  async remove(id: string, orgId: string): Promise<Task> {
    const task = await this.prisma.forTenant(orgId).task.findFirst({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');

    return this.prisma.forTenant(orgId).task.delete({
      where: { id },
    });
  }
}
