import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TracingService } from '../tracing/tracing.service';
import { TracedHttpService } from '../tracing/traced-http.service';
import { TraceExternalService } from '../tracing/tracing.decorators';
import Stripe from 'stripe';

export interface CreatePaymentIntentDto {
  amount: number;
  currency: string;
  customerId: string;
  description?: string;
  metadata?: Record<string, any>;
  paymentMethodId?: string;
  confirm?: boolean;
  returnUrl?: string;
}

export interface CreateSubscriptionDto {
  customerId: string;
  priceId: string;
  paymentMethodId?: string;
  trialDays?: number;
  metadata?: Record<string, any>;
}

@Injectable()
export class StripeTracedService {
  private readonly logger = new Logger(StripeTracedService.name);
  private stripe: Stripe;

  constructor(
    private configService: ConfigService,
    private readonly tracingService: TracingService,
    private readonly tracedHttpService: TracedHttpService,
  ) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is required');
    }

    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });
  }

  /**
   * Create payment intent with tracing
   */
  @TraceExternalService('stripe', 'createPaymentIntent')
  async createPaymentIntent(dto: CreatePaymentIntentDto): Promise<Stripe.PaymentIntent> {
    return this.tracingService.withSpan(
      'payment.stripe.createPaymentIntent',
      async (span) => {
        span.setAttributes({
          'payment.amount': dto.amount,
          'payment.currency': dto.currency,
          'payment.customer_id': dto.customerId,
          'payment.description': dto.description || '',
          'payment.method_id': dto.paymentMethodId || '',
        });

        try {
          const startTime = Date.now();

          const paymentIntent = await this.stripe.paymentIntents.create({
            amount: dto.amount,
            currency: dto.currency,
            customer: dto.customerId,
            description: dto.description,
            metadata: dto.metadata,
            payment_method: dto.paymentMethodId,
            confirmation_method: dto.confirm ? 'manual' : 'automatic',
            return_url: dto.returnUrl,
          });

          const duration = Date.now() - startTime;

          span.setAttributes({
            'payment.intent.id': paymentIntent.id,
            'payment.intent.status': paymentIntent.status,
            'payment.intent.client_secret': paymentIntent.client_secret,
            'payment.operation.duration_ms': duration,
            'payment.operation.success': true,
          });

          this.logger.log(`Payment intent created: ${paymentIntent.id}`, {
            amount: dto.amount,
            currency: dto.currency,
            customerId: dto.customerId,
          });

          return paymentIntent;
        } catch (error) {
          span.setAttributes({
            'payment.operation.success': false,
            'error.name': error.name,
            'error.message': error.message,
          });

          this.logger.error('Failed to create payment intent', {
            error: error.message,
            amount: dto.amount,
            currency: dto.currency,
          });

          throw error;
        }
      },
      {
        'service.name': 'stripe',
        'service.operation': 'createPaymentIntent',
      },
    );
  }

  /**
   * Create subscription with tracing
   */
  @TraceExternalService('stripe', 'createSubscription')
  async createSubscription(dto: CreateSubscriptionDto): Promise<Stripe.Subscription> {
    return this.tracingService.withSpan(
      'payment.stripe.createSubscription',
      async (span) => {
        span.setAttributes({
          'subscription.customer_id': dto.customerId,
          'subscription.price_id': dto.priceId,
          'subscription.payment_method_id': dto.paymentMethodId || '',
          'subscription.trial_days': dto.trialDays || 0,
        });

        try {
          const startTime = Date.now();

          const subscription = await this.stripe.subscriptions.create({
            customer: dto.customerId,
            items: [{ price: dto.priceId }],
            default_payment_method: dto.paymentMethodId,
            trial_period_days: dto.trialDays,
            metadata: dto.metadata,
          });

          const duration = Date.now() - startTime;

          span.setAttributes({
            'subscription.id': subscription.id,
            'subscription.status': subscription.status,
            'subscription.current_period_start': subscription.current_period_start,
            'subscription.current_period_end': subscription.current_period_end,
            'subscription.operation.duration_ms': duration,
            'subscription.operation.success': true,
          });

          this.logger.log(`Subscription created: ${subscription.id}`, {
            customerId: dto.customerId,
            priceId: dto.priceId,
            status: subscription.status,
          });

          return subscription;
        } catch (error) {
          span.setAttributes({
            'subscription.operation.success': false,
            'error.name': error.name,
            'error.message': error.message,
          });

          this.logger.error('Failed to create subscription', {
            error: error.message,
            customerId: dto.customerId,
            priceId: dto.priceId,
          });

          throw error;
        }
      },
      {
        'service.name': 'stripe',
        'service.operation': 'createSubscription',
      },
    );
  }

  /**
   * Retrieve payment intent with tracing
   */
  @TraceExternalService('stripe', 'retrievePaymentIntent')
  async retrievePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    return this.tracingService.withSpan(
      'payment.stripe.retrievePaymentIntent',
      async (span) => {
        span.setAttributes({
          'payment.intent.id': paymentIntentId,
        });

        try {
          const startTime = Date.now();

          const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

          const duration = Date.now() - startTime;

          span.setAttributes({
            'payment.intent.status': paymentIntent.status,
            'payment.amount': paymentIntent.amount,
            'payment.currency': paymentIntent.currency,
            'payment.operation.duration_ms': duration,
            'payment.operation.success': true,
          });

          return paymentIntent;
        } catch (error) {
          span.setAttributes({
            'payment.operation.success': false,
            'error.name': error.name,
            'error.message': error.message,
          });

          throw error;
        }
      },
      {
        'service.name': 'stripe',
        'service.operation': 'retrievePaymentIntent',
      },
    );
  }

  /**
   * Create customer with tracing
   */
  @TraceExternalService('stripe', 'createCustomer')
  async createCustomer(
    email: string,
    name?: string,
    metadata?: Record<string, any>,
  ): Promise<Stripe.Customer> {
    return this.tracingService.withSpan(
      'payment.stripe.createCustomer',
      async (span) => {
        span.setAttributes({
          'customer.email': email,
          'customer.name': name || '',
        });

        try {
          const startTime = Date.now();

          const customer = await this.stripe.customers.create({
            email,
            name,
            metadata,
          });

          const duration = Date.now() - startTime;

          span.setAttributes({
            'customer.id': customer.id,
            'customer.created': customer.created,
            'customer.operation.duration_ms': duration,
            'customer.operation.success': true,
          });

          this.logger.log(`Customer created: ${customer.id}`, {
            email,
            name,
          });

          return customer;
        } catch (error) {
          span.setAttributes({
            'customer.operation.success': false,
            'error.name': error.name,
            'error.message': error.message,
          });

          this.logger.error('Failed to create customer', {
            error: error.message,
            email,
          });

          throw error;
        }
      },
      {
        'service.name': 'stripe',
        'service.operation': 'createCustomer',
      },
    );
  }

  /**
   * Handle webhook with tracing
   */
  @TraceExternalService('stripe', 'handleWebhook')
  async handleWebhook(payload: string, signature: string): Promise<Stripe.Event> {
    return this.tracingService.withSpan(
      'payment.stripe.handleWebhook',
      async (span) => {
        span.setAttributes({
          'webhook.payload_size': payload.length,
          'webhook.has_signature': !!signature,
        });

        try {
          const startTime = Date.now();

          const event = this.stripe.webhooks.constructEvent(
            payload,
            signature,
            this.configService.get<string>('STRIPE_WEBHOOK_SECRET'),
          );

          const duration = Date.now() - startTime;

          span.setAttributes({
            'webhook.event_id': event.id,
            'webhook.event_type': event.type,
            'webhook.created': event.created,
            'webhook.operation.duration_ms': duration,
            'webhook.operation.success': true,
          });

          this.logger.log(`Webhook processed: ${event.type}`, {
            eventId: event.id,
            type: event.type,
          });

          return event;
        } catch (error) {
          span.setAttributes({
            'webhook.operation.success': false,
            'error.name': error.name,
            'error.message': error.message,
          });

          this.logger.error('Failed to process webhook', {
            error: error.message,
          });

          throw error;
        }
      },
      {
        'service.name': 'stripe',
        'service.operation': 'handleWebhook',
      },
    );
  }
}
