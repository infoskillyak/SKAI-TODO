import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles are required, deny access by default (must explicitly specify allowed roles)
    if (!requiredRoles || requiredRoles.length === 0) {
      return false;
    }

    const { user } = context.switchToHttp().getRequest();

    // If user has no role, deny access
    if (!user.role) {
      return false;
    }

    return requiredRoles.some((role) => user.role === role);
  }
}
