import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TasksModule } from './tasks/tasks.module';
import { CalendarModule } from './calendar/calendar.module';
import { BillingModule } from './billing/billing.module';
import { StripeWebhookController, RazorpayWebhookController } from './stripe/stripe.controller';
import { EventsGateway } from './events/events.gateway';
import { AdminModule } from './admin/admin.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [PrismaModule, AuthModule, UsersModule, TasksModule, CalendarModule, AdminModule, BillingModule, PaymentsModule],
  controllers: [AppController, StripeWebhookController, RazorpayWebhookController],
  providers: [AppService, EventsGateway],
})
export class AppModule { }
