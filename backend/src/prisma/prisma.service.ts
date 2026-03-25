import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private _extendedClient: any;

  async onModuleInit() {
    await this.$connect();
  }

  // Helper to get a tenant-scoped client
  // In a real implementation, this would use AsyncLocalStorage to automatically
  // apply the orgId filter to every query.
  forTenant(orgId: string) {
    return this.$extends({
      query: {
        task: {
          async $allOperations({ operation, args, query }) {
            if (['findMany', 'findFirst', 'count', 'update', 'delete', 'updateMany', 'deleteMany'].includes(operation)) {
              const a = args as any;
              a.where = { ...a.where, orgId };
            }
            return query(args);
          },
        },
        taskComment: {
          async $allOperations({ operation, args, query }) {
            if (['findMany', 'findFirst', 'count', 'update', 'delete', 'updateMany', 'deleteMany'].includes(operation)) {
              const a = args as any;
              a.where = { ...a.where, orgId };
            }
            return query(args);
          },
        },
        calendarEvent: {
          async $allOperations({ operation, args, query }) {
            if (['findMany', 'findFirst', 'count', 'update', 'delete', 'updateMany', 'deleteMany'].includes(operation)) {
              const a = args as any;
              a.where = { ...a.where, orgId };
            }
            return query(args);
          },
        },
      },
    });
  }
}
