import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import {
  Payment,
  Subscription,
  PaymentPlan,
  Invoice,
  Refund,
} from '../entities';
import { PaymentStatus, PaymentMethod, SubscriptionStatus } from '../enums';
import { CreatePaymentDto, ProcessPaymentDto } from '../dto';

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    @InjectRepository(Refund)
    private refundRepository: Repository<Refund>,
  ) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2025-12-15.acacia' as any,
    });
  }

  async createPaymentIntent(
    userId: string,
    dto: ProcessPaymentDto,
  ): Promise<string> {
    try {
      const idempotencyKey = dto.idempotencyKey || `payment-${userId}-${Date.now()}`;

      const paymentIntent = await this.stripe.paymentIntents.create(
        {
          amount: Math.round(dto.amount * 100),
          currency: dto.currency.toLowerCase(),
          metadata: {
            userId,
            originalAmount: dto.amount,
          },
        },
        {
          idempotencyKey,
        },
      );

      return paymentIntent.client_secret;
    } catch (error) {
      throw new BadRequestException(`Failed to create payment intent: ${error.message}`);
    }
  }

  async confirmPayment(
    userId: string,
    paymentIntentId: string,
    dto: CreatePaymentDto,
  ): Promise<Payment> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(
        paymentIntentId,
      );

      if (paymentIntent.status !== 'succeeded') {
        throw new BadRequestException('Payment intent not successful');
      }

      // Create payment record
      const payment = this.paymentRepository.create({
        userId,
        amount: dto.amount,
        currency: dto.currency || 'USD',
        paymentMethod: PaymentMethod.STRIPE,
        status: PaymentStatus.COMPLETED,
        transactionId: paymentIntentId,
        gatewayReferenceId: paymentIntent.id,
        description: dto.description,
        metadata: dto.metadata,
        completedAt: new Date(),
      });

      return this.paymentRepository.save(payment);
    } catch (error) {
      throw new BadRequestException(`Failed to confirm payment: ${error.message}`);
    }
  }

  async createSubscription(
    userId: string,
    subscriptionData: any,
  ): Promise<any> {
    try {
      const customer = await this.ensureStripeCustomer(userId);

      const subscription = await this.stripe.subscriptions.create({
        customer: customer.id,
        items: subscriptionData.items,
        metadata: {
          userId,
          ...subscriptionData.metadata,
        },
      });

      return subscription;
    } catch (error) {
      throw new BadRequestException(
        `Failed to create Stripe subscription: ${error.message}`,
      );
    }
  }

  async cancelSubscription(stripeSubscriptionId: string): Promise<void> {
    try {
      await this.stripe.subscriptions.cancel(stripeSubscriptionId);
    } catch (error) {
      throw new BadRequestException(
        `Failed to cancel Stripe subscription: ${error.message}`,
      );
    }
  }

  async refundPayment(
    paymentIntentId: string,
    amount?: number,
  ): Promise<any> {
    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined,
      });

      return refund;
    } catch (error) {
      throw new BadRequestException(`Failed to create refund: ${error.message}`);
    }
  }

  async retrievePayment(paymentIntentId: string): Promise<any> {
    try {
      return await this.stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error) {
      throw new BadRequestException(`Failed to retrieve payment: ${error.message}`);
    }
  }

  private async ensureStripeCustomer(userId: string): Promise<Stripe.Customer> {
    // In production, store the Stripe customer ID in the user entity
    try {
      const customer = await this.stripe.customers.create({
        metadata: {
          userId,
        },
      });
      return customer;
    } catch (error) {
      throw new BadRequestException(`Failed to create Stripe customer: ${error.message}`);
    }
  }
}
