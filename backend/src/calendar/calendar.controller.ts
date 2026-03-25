import { Controller, Get, Post, Delete, UseGuards, Req, Param, Body } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

// All authenticated users can access calendar features
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.USER, Role.ADMIN, Role.SUPERADMIN)
@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) { }

  @Get('events')
  getEvents(@Req() req) {
    return this.calendarService.getEvents(req.user.id);
  }

  @Post('auto-schedule')
  autoSchedule(@Req() req) {
    return this.calendarService.autoSchedule(req.user.id);
  }

  @Post('sync/:provider')
  syncExternalEvents(@Req() req, @Param('provider') provider: string) {
    return this.calendarService.syncExternalEvents(req.user.id, provider);
  }

  @Post('events')
  addEvent(@Req() req, @Body() body: { title: string; startAt: string; endAt: string; provider?: string }) {
    return this.calendarService.addEvent(req.user.id, {
      ...body,
      startAt: new Date(body.startAt),
      endAt: new Date(body.endAt),
    });
  }

  @Delete('events/:id')
  deleteEvent(@Req() req, @Param('id') eventId: string) {
    return this.calendarService.deleteEvent(req.user.id, eventId);
  }
}
