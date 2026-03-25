import { Controller, Post, Req, Res, Body } from '@nestjs/common';
import type { Request, Response } from 'express';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  console.warn('STRIPE_SECRET_KEY is not defined - Stripe webhook will not work');
}

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

@Controller('webhooks/stripe')
export class StripeWebhookController {
  constructor(private prisma: PrismaService) { }

  @Post()
  async handleStripeWebhook(@Req() req: Request, @Res() res: Response) {
    if (!stripe) {
      console.error('Stripe is not configured');
      return res.sendStatus(500);
    }

    const signature = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET is not defined');
      return res.sendStatus(500);
    }

    let event: Stripe.Event;

    try {
      const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
      if (!rawBody) {
        return res.sendStatus(400);
      }
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature as string,
        webhookSecret
      );
    } catch (err: any) {
      console.error(`⚠️  Webhook signature verification failed.`, err.message);
      return res.sendStatus(400);
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const checkoutSession = event.data.object as Stripe.Checkout.Session;
        const customerId = checkoutSession.customer as string;
        const customerEmail = checkoutSession.customer_email;
        const subscriptionId = checkoutSession.subscription as string;
        
        // Idempotency: Check if subscription already active
        const existingSub = await this.prisma.subscription.findUnique({
          where: { stripeSubscriptionId: subscriptionId }
        });

        if (existingSub?.status === 'active') {
          console.log(`ℹ️ Webhook already processed for subscription: ${subscriptionId}`);
          break;
        }

        // Find user by stripe customer ID or email
        let user = await this.prisma.user.findFirst({
          where: { stripeCustomerId: customerId },
        });

        if (!customerEmail) {
          console.log('No customer email in checkout session');
          break;
        }

        // If not found by customer ID, try by email
        if (!user) {
          user = await this.prisma.user.findUnique({
            where: { email: customerEmail },
          });
        }

        if (user) {
          // Determine plan based on price ID
          const priceId = (checkoutSession as any).metadata?.priceId ||
            (checkoutSession as any).display_items?.[0]?.price?.id;

          const plan = this.mapPriceToPlan(priceId);

          await this.prisma.user.update({
            where: { id: user.id },
            data: {
              stripeCustomerId: customerId,
              plan,
            },
          });

          // Create or update subscription
          await this.prisma.subscription.upsert({
            where: { stripeSubscriptionId: subscriptionId },
            update: {
              status: 'active',
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Approximate
            },
            create: {
              stripeSubscriptionId: subscriptionId,
              status: 'active',
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          });

          console.log(`✅ User ${user.email} upgraded to plan: ${plan}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const stripeCustomerId = subscription.customer as string;

        const user = await this.prisma.user.findFirst({
          where: { stripeCustomerId },
        });

        if (user) {
          const plan = this.mapStripeStatusToPlan(subscription.status);

          await this.prisma.user.update({
            where: { id: user.id },
            data: { plan },
          });

          await this.prisma.subscription.update({
            where: { stripeSubscriptionId: subscription.id },
            data: {
              status: subscription.status,
              currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
            },
          });

          console.log(`✅ User ${user.email} subscription updated: ${subscription.status}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const stripeCustomerId = subscription.customer as string;

        const user = await this.prisma.user.findFirst({
          where: { stripeCustomerId },
        });

        if (user) {
          // Downgrade to free plan
          await this.prisma.user.update({
            where: { id: user.id },
            data: { plan: 'FREE' },
          });

          await this.prisma.subscription.update({
            where: { stripeSubscriptionId: subscription.id },
            data: { status: 'canceled' },
          });

          console.log(`⚠️ User ${user.email} subscription canceled - downgraded to FREE`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  }

  /**
   * Map Stripe price ID to our plan
   */
  private mapPriceToPlan(priceId: string | undefined): 'FREE' | 'PRO' | 'TEAM' | 'ENTERPRISE' {
    // These would be environment variables in production
    const proPriceIds = ['price_pro_monthly', 'price_pro_yearly'];
    const teamPriceIds = ['price_team_monthly', 'price_team_yearly'];
    const enterprisePriceIds = ['price_enterprise_monthly', 'price_enterprise_yearly'];

    if (!priceId) return 'PRO';

    if (enterprisePriceIds.includes(priceId)) return 'ENTERPRISE';
    if (teamPriceIds.includes(priceId)) return 'TEAM';
    if (proPriceIds.includes(priceId)) return 'PRO';

    return 'FREE';
  }

  /**
   * Map Stripe subscription status to plan
   */
  private mapStripeStatusToPlan(status: string): 'FREE' | 'PRO' | 'TEAM' | 'ENTERPRISE' {
    switch (status) {
      case 'active':
        return 'PRO'; // Default to PRO for active subscriptions
      case 'trialing':
        return 'PRO';
      case 'past_due':
        return 'FREE'; // Downgrade until payment is collected
      case 'canceled':
      case 'unpaid':
      default:
        return 'FREE';
    }
  }
}

// Separate controller for Razorpay webhooks
@Controller('webhooks/razorpay')
export class RazorpayWebhookController {
  constructor(private prisma: PrismaService) { }

  @Post()
  async handleRazorpayWebhook(@Body() body: any, @Res() res: Response) {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // Verify webhook signature (simplified - in production use proper crypto)
    if (webhookSecret && body.razorpay_signature) {
      // Add signature verification here
    }

    const event = body.event;

    switch (event) {
      case 'payment_captured': {
        const payment = body.payload?.payment?.entity;
        if (payment?.notes?.userId) {
          await this.prisma.user.update({
            where: { id: payment.notes.userId },
            data: { plan: 'PRO' },
          });
          console.log(`✅ User ${payment.notes.userId} payment captured - upgraded to PRO`);
        }
        break;
      }

      case 'subscription_activated': {
        const subscription = body.payload?.subscription?.entity;
        if (subscription?.notes?.userId) {
          const plan = this.mapRazorpyPlanToPlan(subscription.plan_id);
          await this.prisma.user.update({
            where: { id: subscription.notes.userId },
            data: { plan },
          });
          console.log(`✅ User ${subscription.notes.userId} subscription activated`);
        }
        break;
      }

      case 'subscription_cancelled':
      case 'subscription_paused': {
        const subscription = body.payload?.subscription?.entity;
        if (subscription?.notes?.userId) {
          await this.prisma.user.update({
            where: { id: subscription.notes.userId },
            data: { plan: 'FREE' },
          });
          console.log(`⚠️ User ${subscription.notes.userId} subscription canceled - downgraded to FREE`);
        }
        break;
      }

      default:
        console.log(`Unhandled Razorpay event: ${event}`);
    }

    res.json({ received: true });
  }

  private mapRazorpyPlanToPlan(planId: string): 'FREE' | 'PRO' | 'TEAM' | 'ENTERPRISE' {
    // Map based on your Razorpay plan IDs
    if (planId?.includes('enterprise')) return 'ENTERPRISE';
    if (planId?.includes('team')) return 'TEAM';
    if (planId?.includes('pro')) return 'PRO';
    return 'FREE';
  }
}
