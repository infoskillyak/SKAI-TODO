import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role, Prisma } from '@prisma/client';

// All authenticated users can access tasks - USER, ADMIN, and SUPERADMIN roles
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.USER, Role.ADMIN, Role.SUPERADMIN)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) { }

  @Post()
  create(@Body() createTaskDto: Prisma.TaskCreateInput, @Req() req) {
    // If user has no orgId, they'll need to create one first
    if (!req.user.orgId) {
      throw new BadRequestException('User must belong to an organization to create tasks');
    }
    return this.tasksService.create(createTaskDto, req.user.id, req.user.orgId);
  }

  @Get()
  findAll(@Req() req) {
    if (!req.user.orgId) {
      return [];
    }
    return this.tasksService.findAllByOrg(req.user.orgId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req) {
    if (!req.user.orgId) {
      throw new BadRequestException('User must belong to an organization');
    }
    return this.tasksService.findOne(id, req.user.orgId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTaskDto: Prisma.TaskUpdateInput, @Req() req) {
    if (!req.user.orgId) {
      throw new BadRequestException('User must belong to an organization');
    }
    return this.tasksService.update(id, req.user.orgId, updateTaskDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req) {
    if (!req.user.orgId) {
      throw new BadRequestException('User must belong to an organization');
    }
    return this.tasksService.remove(id, req.user.orgId);
  }
}
