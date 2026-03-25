import {
  Controller,
  Post,
  Body,
  Headers,
  RawBodyRequest,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import Stripe from 'stripe';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, Subscription } from '../entities';
import { PaymentStatus, SubscriptionStatus } from '../enums';
import { WebhookAuthGuard } from '../../webhook/guards/webhook-auth.guard';
import { WebhookLoggingInterceptor } from '../../webhook/interceptors/webhook-logging.interceptor';

import { SetWebhookProvider } from '../../webhook/decorators/webhook-provider.decorator';
import { WebhookProvider } from '../../webhook/interfaces/webhook.interfaces';

@Controller('webhooks')
@UseInterceptors(WebhookLoggingInterceptor)
export class WebhookController {
  private stripe: Stripe;

  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
  ) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2025-12-15.acacia' as any,
    });
  }

  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  @UseGuards(WebhookAuthGuard)
  @SetWebhookProvider(WebhookProvider.STRIPE)
  async handleStripeWebhook(@Req() request: RawBodyRequest<any>): Promise<{ received: boolean }> {
    // Webhook is already validated by WebhookAuthGuard
    const event = request.webhookPayload as Stripe.Event;

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await this.handlePaymentIntentSucceeded(paymentIntent);
        break;
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await this.handlePaymentIntentFailed(paymentIntent);
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await this.handleSubscriptionUpdated(subscription);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await this.handleSubscriptionDeleted(subscription);
        break;
      }
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        await this.handleChargeRefunded(charge);
        break;
      }
      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute;
        await this.handleDisputeCreated(dispute);
        break;
      }
    }

    return { received: true };
  }

  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const userId = paymentIntent.metadata?.userId;

    if (!userId) return;

    await this.paymentRepository.update(
      { gatewayReferenceId: paymentIntent.id },
      {
        status: PaymentStatus.COMPLETED,
        completedAt: new Date(),
      },
    );
  }

  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const userId = paymentIntent.metadata?.userId;

    if (!userId) return;

    await this.paymentRepository.update(
      { gatewayReferenceId: paymentIntent.id },
      {
        status: PaymentStatus.FAILED,
        failureReason: paymentIntent.last_payment_error?.message,
      },
    );
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const userId = subscription.metadata?.userId;

    if (!userId) return;

    const status =
      subscription.status === 'active'
        ? SubscriptionStatus.ACTIVE
        : subscription.status === 'paused'
          ? SubscriptionStatus.PAUSED
          : SubscriptionStatus.CANCELLED;

    await this.subscriptionRepository.update(
      { externalSubscriptionId: subscription.id },
      { status },
    );
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const userId = subscription.metadata?.userId;

    if (!userId) return;

    await this.subscriptionRepository.update(
      { externalSubscriptionId: subscription.id },
      {
        status: SubscriptionStatus.CANCELLED,
        endDate: new Date(),
      },
    );
  }

  private async handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
    // Handle refund webhook
  }

  private async handleDisputeCreated(dispute: Stripe.Dispute): Promise<void> {
    // Handle dispute webhook
  }

  @Post('paypal')
  @HttpCode(HttpStatus.OK)
  @UseGuards(WebhookAuthGuard)
  @SetWebhookProvider(WebhookProvider.PAYPAL)
  async handlePayPalWebhook(@Req() request: any): Promise<{ received: boolean }> {
    // Webhook is already validated by WebhookAuthGuard
    const event = request.webhookPayload;

    // Handle various PayPal events
    // TODO: Implement PayPal-specific event handling

    return { received: true };
  }
}
