import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Task, CalendarEvent, Quadrant } from '@prisma/client';
import { addMinutes, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(private prisma: PrismaService) { }

  /**
   * The core AI "Auto-Planner" engine.
   * Maps high-priority tasks into available time slots.
   */
  async autoSchedule(userId: string) {
    this.logger.log(`Starting AI Auto-Scheduling for user: ${userId}`);

    // 1. Get all incomplete Q1 and Q2 tasks
    const tasks = await this.prisma.task.findMany({
      where: {
        createdBy: userId,
        status: 'TODO',
        quadrant: { in: [Quadrant.Q1, Quadrant.Q2] },
      },
      orderBy: [
        { quadrant: 'asc' }, // Q1 first
        { priorityScore: 'desc' },
      ],
    });

    // 2. Get today's existing calendar events to find gaps
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    const events = await this.prisma.calendarEvent.findMany({
      where: {
        userId,
        startAt: { gte: todayStart },
        endAt: { lte: todayEnd },
      },
      orderBy: { startAt: 'asc' },
    });

    // 3. Simple Gap-Filling Algorithm
    let currentSlot = addMinutes(new Date(), 15); // Start scheduling 15 mins from now
    const scheduledTasks: { taskId: string; title: string; start: Date; end: Date }[] = [];

    for (const task of tasks) {
      const duration = task.estimatedDuration || 30; // Default to 30 mins

      // Find the next available slot that doesn't overlap with existing events
      let foundSlot = false;
      while (!foundSlot && isBefore(currentSlot, todayEnd)) {
        const potentialEnd = addMinutes(currentSlot, duration);

        const hasOverlap = events.some(event =>
          (isAfter(potentialEnd, event.startAt) && isBefore(currentSlot, event.endAt))
        );

        if (!hasOverlap) {
          // Found a gap! 
          scheduledTasks.push({
            taskId: task.id,
            title: task.title,
            start: new Date(currentSlot),
            end: new Date(potentialEnd),
          });
          currentSlot = potentialEnd; // Move pointer forward
          foundSlot = true;
        } else {
          // Skip past the overlapping event
          const overlappingEvent = events.find(event =>
            (isAfter(potentialEnd, event.startAt) && isBefore(currentSlot, event.endAt))
          );
          if (overlappingEvent) {
            currentSlot = new Date(overlappingEvent.endAt);
          } else {
            currentSlot = addMinutes(currentSlot, 15);
          }
        }
      }
    }

    return {
      suggestedSchedule: scheduledTasks,
      analysis: `Scheduled ${scheduledTasks.length} tasks into today's available gaps. Focus was on ${Quadrant.Q1} and ${Quadrant.Q2} items.`,
    };
  }

  async getEvents(userId: string) {
    return this.prisma.calendarEvent.findMany({
      where: { userId },
      orderBy: { startAt: 'asc' },
    });
  }

  /**
   * Sync events from external calendar provider (Google/Outlook)
   */
  async syncExternalEvents(userId: string, provider: string): Promise<{ synced: number; message: string }> {
    // Get user to check for OAuth tokens
    const user = await this.prisma.user.findUnique({ where: { id: userId } }) as any;
    if (!user) {
      throw new NotFoundException('User not found');
    }

    let hasAccessToken = false;
    if (provider.toLowerCase() === 'google') {
      hasAccessToken = !!user.googleAccessToken;
    } else if (provider.toLowerCase() === 'outlook') {
      hasAccessToken = !!user.outlookAccessToken;
    }

    if (!hasAccessToken) {
      throw new BadRequestException(`${provider} calendar not connected`);
    }

    // In a real implementation, this would call the Google/Outlook API
    // For now, return a mock response indicating the feature is available
    // The actual implementation would use the OAuth tokens to fetch events
    // from the respective calendar APIs

    return {
      synced: 0,
      message: `${provider} calendar sync initiated. In production, this would fetch events from ${provider} API.`,
    };
  }

  /**
   * Add a calendar event manually
   */
  async addEvent(userId: string, data: {
    title: string;
    startAt: Date;
    endAt: Date;
    provider?: string;
  }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get orgId from user
    if (!user.orgId) {
      throw new BadRequestException('User must belong to an organization to create calendar events');
    }
    const orgId = user.orgId;

    return this.prisma.calendarEvent.create({
      data: {
        userId,
        orgId,
        title: data.title,
        startAt: data.startAt,
        endAt: data.endAt,
        providerEventId: `manual_${Date.now()}`,
        provider: data.provider?.toUpperCase() as any || 'GOOGLE',
      },
    });
  }

  /**
   * Delete a calendar event
   */
  async deleteEvent(userId: string, eventId: string) {
    const event = await this.prisma.calendarEvent.findFirst({
      where: { id: eventId, userId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    await this.prisma.calendarEvent.delete({
      where: { id: eventId },
    });

    return { success: true, message: 'Event deleted' };
  }
}
