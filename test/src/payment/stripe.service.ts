import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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

export interface CreateInvoiceDto {
  customerId: string;
  description?: string;
  lineItems: Array<{
    price: string;
    quantity: number;
    description?: string;
  }>;
  metadata?: Record<string, any>;
  dueDate?: Date;
}

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private stripe: Stripe;

  constructor(private configService: ConfigService) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is required');
    }

    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });
  }

  /**
   * Create a customer in Stripe
   */
  async createCustomer(data: {
    email: string;
    name?: string;
    phone?: string;
    metadata?: Record<string, any>;
  }): Promise<Stripe.Customer> {
    try {
      const customer = await this.stripe.customers.create({
        email: data.email,
        name: data.name,
        phone: data.phone,
        metadata: data.metadata,
      });

      this.logger.log(`Created Stripe customer: ${customer.id}`);
      return customer;
    } catch (error) {
      this.logger.error('Failed to create Stripe customer', error);
      throw error;
    }
  }

  /**
   * Create a payment intent
   */
  async createPaymentIntent(data: CreatePaymentIntentDto): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: data.amount,
        currency: data.currency,
        customer: data.customerId,
        description: data.description,
        metadata: data.metadata,
        payment_method: data.paymentMethodId,
        confirm: data.confirm,
        return_url: data.returnUrl,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      this.logger.log(`Created payment intent: ${paymentIntent.id}`);
      return paymentIntent;
    } catch (error) {
      this.logger.error('Failed to create payment intent', error);
      throw error;
    }
  }

  /**
   * Confirm a payment intent
   */
  async confirmPaymentIntent(
    paymentIntentId: string,
    paymentMethodId?: string,
  ): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.confirm(paymentIntentId, {
        payment_method: paymentMethodId,
      });

      this.logger.log(`Confirmed payment intent: ${paymentIntent.id}`);
      return paymentIntent;
    } catch (error) {
      this.logger.error('Failed to confirm payment intent', error);
      throw error;
    }
  }

  /**
   * Create a subscription
   */
  async createSubscription(data: CreateSubscriptionDto): Promise<Stripe.Subscription> {
    try {
      const subscription = await this.stripe.subscriptions.create({
        customer: data.customerId,
        items: [{ price: data.priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        trial_period_days: data.trialDays,
        metadata: data.metadata,
      });

      this.logger.log(`Created subscription: ${subscription.id}`);
      return subscription;
    } catch (error) {
      this.logger.error('Failed to create subscription', error);
      throw error;
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd: boolean = true,
  ): Promise<Stripe.Subscription> {
    try {
      const subscription = await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: cancelAtPeriodEnd,
      });

      this.logger.log(`Cancelled subscription: ${subscription.id}`);
      return subscription;
    } catch (error) {
      this.logger.error('Failed to cancel subscription', error);
      throw error;
    }
  }

  /**
   * Create an invoice
   */
  async createInvoice(data: CreateInvoiceDto): Promise<Stripe.Invoice> {
    try {
      const invoice = await this.stripe.invoices.create({
        customer: data.customerId,
        description: data.description,
        metadata: data.metadata,
        due_date: data.dueDate ? Math.floor(data.dueDate.getTime() / 1000) : undefined,
        collection_method: 'charge_automatically',
        auto_advance: true,
      });

      // Add line items
      for (const item of data.lineItems) {
        await this.stripe.invoiceItems.create({
          customer: data.customerId,
          invoice: invoice.id,
          price: item.price,
          quantity: item.quantity,
          description: item.description,
        });
      }

      // Finalize the invoice
      const finalizedInvoice = await this.stripe.invoices.finalizeInvoice(invoice.id);

      this.logger.log(`Created invoice: ${finalizedInvoice.id}`);
      return finalizedInvoice;
    } catch (error) {
      this.logger.error('Failed to create invoice', error);
      throw error;
    }
  }

  /**
   * Pay an invoice
   */
  async payInvoice(invoiceId: string, paymentMethodId?: string): Promise<Stripe.Invoice> {
    try {
      const invoice = await this.stripe.invoices.pay(invoiceId, {
        paid_out_of_band: false,
        payment_method: paymentMethodId,
      });

      this.logger.log(`Paid invoice: ${invoice.id}`);
      return invoice;
    } catch (error) {
      this.logger.error('Failed to pay invoice', error);
      throw error;
    }
  }

  /**
   * Create a payment method
   */
  async createPaymentMethod(data: {
    type: 'card' | 'bank_account';
    card?: {
      number: string;
      exp_month: number;
      exp_year: number;
      cvc: string;
    };
    billing_details?: {
      name?: string;
      email?: string;
      phone?: string;
      address?: {
        line1?: string;
        line2?: string;
        city?: string;
        state?: string;
        postal_code?: string;
        country?: string;
      };
    };
  }): Promise<Stripe.PaymentMethod> {
    try {
      const paymentMethod = await this.stripe.paymentMethods.create({
        type: data.type,
        card: data.card,
        billing_details: data.billing_details,
      });

      this.logger.log(`Created payment method: ${paymentMethod.id}`);
      return paymentMethod;
    } catch (error) {
      this.logger.error('Failed to create payment method', error);
      throw error;
    }
  }

  /**
   * Attach payment method to customer
   */
  async attachPaymentMethod(
    paymentMethodId: string,
    customerId: string,
  ): Promise<Stripe.PaymentMethod> {
    try {
      const paymentMethod = await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      this.logger.log(`Attached payment method ${paymentMethodId} to customer ${customerId}`);
      return paymentMethod;
    } catch (error) {
      this.logger.error('Failed to attach payment method', error);
      throw error;
    }
  }

  /**
   * Create a refund
   */
  async createRefund(data: {
    paymentIntentId: string;
    amount?: number;
    reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
    metadata?: Record<string, any>;
  }): Promise<Stripe.Refund> {
    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: data.paymentIntentId,
        amount: data.amount,
        reason: data.reason,
        metadata: data.metadata,
      });

      this.logger.log(`Created refund: ${refund.id}`);
      return refund;
    } catch (error) {
      this.logger.error('Failed to create refund', error);
      throw error;
    }
  }

  /**
   * Get customer by ID
   */
  async getCustomer(customerId: string): Promise<Stripe.Customer> {
    try {
      const customer = await this.stripe.customers.retrieve(customerId);
      return customer as Stripe.Customer;
    } catch (error) {
      this.logger.error('Failed to get customer', error);
      throw error;
    }
  }

  /**
   * Get payment intent by ID
   */
  async getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      return paymentIntent;
    } catch (error) {
      this.logger.error('Failed to get payment intent', error);
      throw error;
    }
  }

  /**
   * Get subscription by ID
   */
  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
      return subscription;
    } catch (error) {
      this.logger.error('Failed to get subscription', error);
      throw error;
    }
  }

  /**
   * Get invoice by ID
   */
  async getInvoice(invoiceId: string): Promise<Stripe.Invoice> {
    try {
      const invoice = await this.stripe.invoices.retrieve(invoiceId);
      return invoice;
    } catch (error) {
      this.logger.error('Failed to get invoice', error);
      throw error;
    }
  }

  /**
   * List customer payment methods
   */
  async listCustomerPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
    try {
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      return paymentMethods.data;
    } catch (error) {
      this.logger.error('Failed to list customer payment methods', error);
      throw error;
    }
  }

  /**
   * Create a price for subscription
   */
  async createPrice(data: {
    unitAmount: number;
    currency: string;
    recurring: {
      interval: 'day' | 'week' | 'month' | 'year';
      intervalCount?: number;
    };
    productId: string;
    nickname?: string;
    metadata?: Record<string, any>;
  }): Promise<Stripe.Price> {
    try {
      const price = await this.stripe.prices.create({
        unit_amount: data.unitAmount,
        currency: data.currency,
        recurring: data.recurring,
        product: data.productId,
        nickname: data.nickname,
        metadata: data.metadata,
      });

      this.logger.log(`Created price: ${price.id}`);
      return price;
    } catch (error) {
      this.logger.error('Failed to create price', error);
      throw error;
    }
  }

  /**
   * Create a product
   */
  async createProduct(data: {
    name: string;
    description?: string;
    metadata?: Record<string, any>;
  }): Promise<Stripe.Product> {
    try {
      const product = await this.stripe.products.create({
        name: data.name,
        description: data.description,
        metadata: data.metadata,
      });

      this.logger.log(`Created product: ${product.id}`);
      return product;
    } catch (error) {
      this.logger.error('Failed to create product', error);
      throw error;
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(
    payload: string | Buffer,
    signature: string,
    secret: string,
  ): Stripe.Event {
    try {
      const event = this.stripe.webhooks.constructEvent(payload, signature, secret);
      return event;
    } catch (error) {
      this.logger.error('Webhook signature verification failed', error);
      throw error;
    }
  }
} 