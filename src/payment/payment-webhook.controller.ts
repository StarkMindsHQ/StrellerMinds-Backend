import {
  Controller,
  Post,
  Headers,
  Body,
  RawBodyRequest,
  Req,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentService } from './payment.service';
import { SubscriptionService } from './subscription.service';
import { InvoiceService } from './invoice.service';
import { StripeService } from './stripe.service';
import { PaymentStatus } from './entities/payment.entity';
import { SubscriptionStatus } from './entities/subscription.entity';
import { InvoiceStatus } from './entities/invoice.entity';

@Controller('webhooks/stripe')
export class PaymentWebhookController {
  private readonly logger = new Logger(PaymentWebhookController.name);

  constructor(
    private configService: ConfigService,
    private paymentService: PaymentService,
    private subscriptionService: SubscriptionService,
    private invoiceService: InvoiceService,
    private stripeService: StripeService,
  ) {}

  @Post()
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() request: RawBodyRequest<Request>,
  ): Promise<{ received: boolean }> {
    try {
      const stripeWebhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
      if (!stripeWebhookSecret) {
        throw new BadRequestException('STRIPE_WEBHOOK_SECRET is not configured');
      }

      // Verify webhook signature
      const event = this.stripeService.verifyWebhookSignature(
        request.rawBody,
        signature,
        stripeWebhookSecret,
      );

      this.logger.log(`Received Stripe webhook: ${event.type}`);

      // Handle different event types
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(event.data.object);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(event.data.object);
          break;
        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(event.data.object);
          break;
        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object);
          break;
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object);
          break;
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object);
          break;
        case 'invoice.created':
          await this.handleInvoiceCreated(event.data.object);
          break;
        case 'invoice.paid':
          await this.handleInvoicePaid(event.data.object);
          break;
        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object);
          break;
        default:
          this.logger.log(`Unhandled event type: ${event.type}`);
      }

      return { received: true };
    } catch (error) {
      this.logger.error('Webhook error:', error);
      throw new BadRequestException('Webhook signature verification failed');
    }
  }

  /**
   * Handle payment intent succeeded
   */
  private async handlePaymentIntentSucceeded(paymentIntent: any): Promise<void> {
    try {
      await this.paymentService.updatePaymentFromWebhook(paymentIntent.id, PaymentStatus.COMPLETED);
      this.logger.log(`Payment intent succeeded: ${paymentIntent.id}`);
    } catch (error) {
      this.logger.error('Failed to handle payment intent succeeded', error);
    }
  }

  /**
   * Handle payment intent failed
   */
  private async handlePaymentIntentFailed(paymentIntent: any): Promise<void> {
    try {
      await this.paymentService.updatePaymentFromWebhook(paymentIntent.id, PaymentStatus.FAILED);
      this.logger.log(`Payment intent failed: ${paymentIntent.id}`);
    } catch (error) {
      this.logger.error('Failed to handle payment intent failed', error);
    }
  }

  /**
   * Handle invoice payment succeeded
   */
  private async handleInvoicePaymentSucceeded(invoice: any): Promise<void> {
    try {
      await this.invoiceService.updateInvoiceFromWebhook(invoice.id, InvoiceStatus.PAID);
      this.logger.log(`Invoice payment succeeded: ${invoice.id}`);
    } catch (error) {
      this.logger.error('Failed to handle invoice payment succeeded', error);
    }
  }

  /**
   * Handle invoice payment failed
   */
  private async handleInvoicePaymentFailed(invoice: any): Promise<void> {
    try {
      await this.invoiceService.updateInvoiceFromWebhook(invoice.id, InvoiceStatus.OPEN);
      this.logger.log(`Invoice payment failed: ${invoice.id}`);
    } catch (error) {
      this.logger.error('Failed to handle invoice payment failed', error);
    }
  }

  /**
   * Handle subscription created
   */
  private async handleSubscriptionCreated(subscription: any): Promise<void> {
    try {
      // This would typically update a subscription record
      this.logger.log(`Subscription created: ${subscription.id}`);
    } catch (error) {
      this.logger.error('Failed to handle subscription created', error);
    }
  }

  /**
   * Handle subscription updated
   */
  private async handleSubscriptionUpdated(subscription: any): Promise<void> {
    try {
      const status = this.mapStripeSubscriptionStatus(subscription.status);
      await this.subscriptionService.updateSubscriptionFromWebhook(subscription.id, status);
      this.logger.log(`Subscription updated: ${subscription.id} - Status: ${status}`);
    } catch (error) {
      this.logger.error('Failed to handle subscription updated', error);
    }
  }

  /**
   * Handle subscription deleted
   */
  private async handleSubscriptionDeleted(subscription: any): Promise<void> {
    try {
      await this.subscriptionService.updateSubscriptionFromWebhook(
        subscription.id,
        SubscriptionStatus.CANCELLED,
      );
      this.logger.log(`Subscription deleted: ${subscription.id}`);
    } catch (error) {
      this.logger.error('Failed to handle subscription deleted', error);
    }
  }

  /**
   * Handle invoice created
   */
  private async handleInvoiceCreated(invoice: any): Promise<void> {
    try {
      this.logger.log(`Invoice created: ${invoice.id}`);
    } catch (error) {
      this.logger.error('Failed to handle invoice created', error);
    }
  }

  /**
   * Handle invoice paid
   */
  private async handleInvoicePaid(invoice: any): Promise<void> {
    try {
      await this.invoiceService.updateInvoiceFromWebhook(invoice.id, InvoiceStatus.PAID);
      this.logger.log(`Invoice paid: ${invoice.id}`);
    } catch (error) {
      this.logger.error('Failed to handle invoice paid', error);
    }
  }

  /**
   * Map Stripe subscription status to our enum
   */
  private mapStripeSubscriptionStatus(stripeStatus: string): SubscriptionStatus {
    switch (stripeStatus) {
      case 'active':
        return SubscriptionStatus.ACTIVE;
      case 'canceled':
        return SubscriptionStatus.CANCELLED;
      case 'past_due':
        return SubscriptionStatus.PAST_DUE;
      case 'unpaid':
        return SubscriptionStatus.UNPAID;
      case 'trialing':
        return SubscriptionStatus.TRIAL;
      default:
        return SubscriptionStatus.INACTIVE;
    }
  }
}
