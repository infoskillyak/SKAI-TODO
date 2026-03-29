import { Controller, Post, Body, Headers, UnauthorizedException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Controller('webhooks')
export class RazorpayWebhookController {
  private readonly logger = new Logger(RazorpayWebhookController.name);

  constructor(private prisma: PrismaService) {}

  @Post('razorpay')
  async handleWebhook(
    @Body() payload: any,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    this.logger.log('Received Razorpay Webhook');

    // 1. Verify signature
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'skai_secret';
    const body = JSON.stringify(payload);
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      // Use timing-safe comparison to prevent timing attacks
      const sigBuffer = Buffer.from(signature || '', 'utf8');
      const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
      if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
        this.logger.error('Invalid Razorpay signature');
        throw new UnauthorizedException('Invalid signature');
      }
    }

    // 2. Process Event (e.g., subscription.paid, payment.captured)
    const event = payload.event;
    const data = payload.payload;

    switch (event) {
      case 'subscription.charged':
      case 'order.paid':
        await this.handlePaymentSuccess(data);
        break;
      case 'subscription.cancelled':
        await this.handleSubscriptionCancelled(data);
        break;
      default:
        this.logger.log(`Unhandled event type: ${event}`);
    }

    return { status: 'ok' };
  }

  private async handlePaymentSuccess(data: any) {
    const email = data.payment?.entity?.email || data.subscription?.entity?.notes?.email;
    if (!email) return;

    this.logger.log(`Upgrading user ${email} to PRO plan`);

    await this.prisma.user.update({
      where: { email },
      data: { plan: 'PRO' },
    });
  }

  private async handleSubscriptionCancelled(data: any) {
    const email = data.subscription?.entity?.notes?.email;
    if (!email) return;

    await this.prisma.user.update({
      where: { email },
      data: { plan: 'FREE' },
    });
  }
}
