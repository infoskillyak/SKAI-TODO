import { Controller, Get, Patch, Post, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role, Plan } from '@prisma/client';

// DTOs
class UpdateUserDto {
  name?: string;
  role?: Role;
  plan?: Plan;
  orgId?: string | null;
}

class UserQueryDto {
  skip?: number;
  take?: number;
  role?: Role;
  plan?: Plan;
  search?: string;
}

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) { }

  // ==================== System Configuration ====================

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles((Role as any).SUPERADMIN, Role.ADMIN)
  @Get('config')
  getConfig() {
    return this.adminService.getConfig();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles((Role as any).SUPERADMIN, Role.ADMIN)
  @Patch('config')
  updateConfig(@Body() updateConfigDto: any) {
    return this.adminService.updateConfig(updateConfigDto);
  }

  // ==================== Organization Management ====================

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles((Role as any).SUPERADMIN)
  @Post('organizations')
  createOrganization(@Body() data: { name: string; id?: string }) {
    return this.adminService.createOrganization(data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles((Role as any).SUPERADMIN)
  @Get('organizations')
  getOrganizations() {
    return this.adminService.getOrganizations();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles((Role as any).SUPERADMIN)
  @Patch('organizations/:id')
  updateOrganization(@Param('id') id: string, @Body() data: { name?: string; billingPlan?: string }) {
    return this.adminService.updateOrganization(id, data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles((Role as any).SUPERADMIN)
  @Delete('organizations/:id')
  deleteOrganization(@Param('id') id: string) {
    return this.adminService.deleteOrganization(id);
  }

  // ==================== User Management ====================


  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles((Role as any).SUPERADMIN)
  @Post('users')
  createUser(@Body() data: any) {
    return this.adminService.createUser(data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles((Role as any).SUPERADMIN, Role.ADMIN)
  @Get('users')
  getUsers(@Query() query: UserQueryDto, @Req() req: any) {
    return this.adminService.getUsers({
      skip: query.skip ? parseInt(String(query.skip)) : 0,
      take: query.take ? parseInt(String(query.take)) : 50,
      role: query.role,
      plan: query.plan,
      search: query.search,
      requestingUser: req.user,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('users/:id')
  getUser(@Param('id') id: string) {
    return this.adminService.getUser(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('users/:id')
  updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.adminService.updateUser(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  // ==================== Statistics ====================

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles((Role as any).SUPERADMIN, Role.ADMIN)
  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  // ==================== Plan Pricing Management ====================

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles((Role as any).SUPERADMIN)
  @Get('plans/pricing')
  getPlanPricing() {
    return this.adminService.getPlanPricing();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles((Role as any).SUPERADMIN)
  @Post('plans/pricing')
  updatePlanPricing(@Body() body: { plan: Plan; monthlyPrice?: number; yearlyPrice?: number; maxUsers?: number; maxTasks?: number; features?: string[] }) {
    return this.adminService.updatePlanPricing(body.plan, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles((Role as any).SUPERADMIN)
  @Delete('plans/pricing/:plan')
  deletePlanPricing(@Param('plan') plan: string) {
    return this.adminService.deletePlanPricing(plan as Plan);
  }

  // ==================== n8n Integration ====================

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles((Role as any).SUPERADMIN, Role.ADMIN)
  @Post('n8n/test-connection')
  testN8nConnection(@Body() body: { baseUrl: string; apiKey: string }) {
    return this.adminService.testN8nConnection(body.baseUrl, body.apiKey);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles((Role as any).SUPERADMIN, Role.ADMIN)
  @Post('n8n/test-payment-gateway')
  testPaymentGateway(@Body() body: { gateway: 'stripe' | 'razorpay'; credentials: any }) {
    return this.adminService.testPaymentGateway(body.gateway, body.credentials);
  }
}
