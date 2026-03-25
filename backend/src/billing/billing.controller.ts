import { Controller, Get, Post, Body, Param, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role, Plan } from '@prisma/client';

// All authenticated users can view billing info for their org
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) { }

  @Roles(Role.USER, Role.ADMIN, Role.SUPERADMIN)
  @Get('my-org')
  async getMyOrgBilling(@Req() req) {
    return this.billingService.getOrgBilling(req.user.orgId);
  }

  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @Post('update-plan')
  async updatePlan(@Body() data: { orgId: string; plan: Plan }, @Req() req) {
    // Safety check: ensure the admin belongs to the org they are updating
    // (unless they are SUPERADMIN who can manage any org)
    if (req.user.role !== Role.SUPERADMIN && req.user.orgId !== data.orgId) {
      throw new ForbiddenException('You can only update your own organization plan');
    }

    return this.billingService.updatePlan(data.orgId, data.plan);
  }
}
