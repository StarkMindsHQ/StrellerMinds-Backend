import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentEntity, PaymentStatus, PaymentType } from './entities/payment.entity';
import { StripeService } from './stripe.service';
import { InvoiceService } from './invoice.service';
import { PaymentAnalyticsService } from './payment-analytics.service';

export interface CreatePaymentDto {
  userId: string;
  amount: number;
  currency: string;
  type: PaymentType;
  courseId?: string;
  subscriptionId?: string;
  description?: string;
  paymentMethodId?: string;
  metadata?: Record<string, any>;
  customerEmail?: string;
  customerName?: string;
  billingAddress?: string;
  taxAmount?: number;
  discountAmount?: number;
  couponCode?: string;
}

export interface ProcessPaymentDto {
  paymentId: string;
  paymentMethodId?: string;
  confirm?: boolean;
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectRepository(PaymentEntity)
    private paymentRepository: Repository<PaymentEntity>,
    private stripeService: StripeService,
    private invoiceService: InvoiceService,
    private paymentAnalyticsService: PaymentAnalyticsService,
  ) {}

  /**
   * Create a new payment
   */
  async createPayment(data: CreatePaymentDto): Promise<PaymentEntity> {
    try {
      // Create or get Stripe customer
      const customer = await this.getOrCreateStripeCustomer(data.userId, {
        email: data.customerEmail,
        name: data.customerName,
      });

      // Create payment intent in Stripe
      const paymentIntent = await this.stripeService.createPaymentIntent({
        amount: data.amount,
        currency: data.currency,
        customerId: customer.id,
        description: data.description,
        metadata: {
          ...data.metadata,
          userId: data.userId,
          courseId: data.courseId,
          subscriptionId: data.subscriptionId,
          type: data.type,
        },
        paymentMethodId: data.paymentMethodId,
        confirm: false,
      });

      // Create payment record in database
      const payment = this.paymentRepository.create({
        userId: data.userId,
        stripePaymentIntentId: paymentIntent.id,
        amount: data.amount,
        currency: data.currency,
        status: PaymentStatus.PENDING,
        type: data.type,
        courseId: data.courseId,
        subscriptionId: data.subscriptionId,
        description: data.description,
        metadata: data.metadata,
        customerEmail: data.customerEmail,
        customerName: data.customerName,
        billingAddress: data.billingAddress,
        taxAmount: data.taxAmount,
        discountAmount: data.discountAmount,
        couponCode: data.couponCode,
      });

      const savedPayment = await this.paymentRepository.save(payment);

      this.logger.log(`Created payment: ${savedPayment.id}`);
      return savedPayment;
    } catch (error) {
      this.logger.error('Failed to create payment', error);
      throw error;
    }
  }

  /**
   * Process a payment
   */
  async processPayment(data: ProcessPaymentDto): Promise<PaymentEntity> {
    try {
      const payment = await this.getPaymentById(data.paymentId);

      if (payment.status !== PaymentStatus.PENDING) {
        throw new BadRequestException(`Payment is not in pending status: ${payment.status}`);
      }

      // Confirm payment intent in Stripe
      const paymentIntent = await this.stripeService.confirmPaymentIntent(
        payment.stripePaymentIntentId,
        data.paymentMethodId,
      );

      // Update payment status based on Stripe response
      let status = PaymentStatus.PROCESSING;
      if (paymentIntent.status === 'succeeded') {
        status = PaymentStatus.COMPLETED;
      } else if (paymentIntent.status === 'requires_payment_method') {
        status = PaymentStatus.FAILED;
      }

      // Update payment record
      payment.status = status;
      payment.completedAt = status === PaymentStatus.COMPLETED ? new Date() : undefined;

      if (status === PaymentStatus.FAILED) {
        payment.failureReason = paymentIntent.last_payment_error?.message || 'Payment failed';
      }

      const updatedPayment = await this.paymentRepository.save(payment);

      // Track payment analytics
      await this.paymentAnalyticsService.trackPayment(updatedPayment);

      // Generate invoice if payment is completed
      if (status === PaymentStatus.COMPLETED) {
        await this.invoiceService.generateInvoiceForPayment(updatedPayment.id);
      }

      this.logger.log(`Processed payment: ${updatedPayment.id} - Status: ${status}`);
      return updatedPayment;
    } catch (error) {
      this.logger.error('Failed to process payment', error);
      throw error;
    }
  }

  /**
   * Get payment by ID
   */
  async getPaymentById(paymentId: string): Promise<PaymentEntity> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
      relations: ['user', 'invoices'],
    });

    if (!payment) {
      throw new NotFoundException(`Payment not found: ${paymentId}`);
    }

    return payment;
  }

  /**
   * Get payments by user ID
   */
  async getPaymentsByUserId(userId: string): Promise<PaymentEntity[]> {
    return this.paymentRepository.find({
      where: { userId },
      relations: ['invoices'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get payments by course ID
   */
  async getPaymentsByCourseId(courseId: string): Promise<PaymentEntity[]> {
    return this.paymentRepository.find({
      where: { courseId },
      relations: ['user', 'invoices'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get payments by subscription ID
   */
  async getPaymentsBySubscriptionId(subscriptionId: string): Promise<PaymentEntity[]> {
    return this.paymentRepository.find({
      where: { subscriptionId },
      relations: ['user', 'invoices'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Refund a payment
   */
  async refundPayment(paymentId: string, reason?: string, amount?: number): Promise<PaymentEntity> {
    try {
      const payment = await this.getPaymentById(paymentId);

      if (payment.status !== PaymentStatus.COMPLETED) {
        throw new BadRequestException('Only completed payments can be refunded');
      }

      // Create refund in Stripe
      const refund = await this.stripeService.createRefund({
        paymentIntentId: payment.stripePaymentIntentId,
        amount: amount,
        reason: 'requested_by_customer',
        metadata: {
          paymentId: payment.id,
          reason: reason,
        },
      });

      // Update payment status
      payment.status = PaymentStatus.REFUNDED;
      payment.refundReason = reason;
      payment.refundedAt = new Date();

      const updatedPayment = await this.paymentRepository.save(payment);

      this.logger.log(`Refunded payment: ${paymentId}`);
      return updatedPayment;
    } catch (error) {
      this.logger.error('Failed to refund payment', error);
      throw error;
    }
  }

  /**
   * Get payment statistics
   */
  async getPaymentStats(userId?: string): Promise<any> {
    const query = this.paymentRepository.createQueryBuilder('payment');

    if (userId) {
      query.where('payment.userId = :userId', { userId });
    }

    const stats = await query
      .select([
        'payment.status',
        'payment.type',
        'COUNT(*) as count',
        'SUM(payment.amount) as total_amount',
      ])
      .groupBy('payment.status, payment.type')
      .getRawMany();

    return stats;
  }

  /**
   * Get payment analytics
   */
  async getPaymentAnalytics(days: number = 30): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const analytics = await this.paymentRepository
      .createQueryBuilder('payment')
      .select([
        'DATE(payment.createdAt) as date',
        'payment.status',
        'payment.type',
        'COUNT(*) as count',
        'SUM(payment.amount) as total_amount',
      ])
      .where('payment.createdAt >= :startDate', { startDate })
      .groupBy('DATE(payment.createdAt), payment.status, payment.type')
      .orderBy('date', 'DESC')
      .getRawMany();

    return analytics;
  }

  /**
   * Update payment status from webhook
   */
  async updatePaymentFromWebhook(
    stripePaymentIntentId: string,
    status: PaymentStatus,
  ): Promise<PaymentEntity> {
    const payment = await this.paymentRepository.findOne({
      where: { stripePaymentIntentId },
    });

    if (!payment) {
      throw new NotFoundException(
        `Payment not found for Stripe payment intent: ${stripePaymentIntentId}`,
      );
    }

    payment.status = status;

    if (status === PaymentStatus.COMPLETED) {
      payment.completedAt = new Date();
    }

    const updatedPayment = await this.paymentRepository.save(payment);

    // Track payment analytics
    await this.paymentAnalyticsService.trackPayment(updatedPayment);

    this.logger.log(`Updated payment from webhook: ${payment.id} - Status: ${status}`);
    return updatedPayment;
  }

  /**
   * Get or create Stripe customer
   */
  private async getOrCreateStripeCustomer(
    userId: string,
    customerData: {
      email?: string;
      name?: string;
    },
  ): Promise<any> {
    // In a real implementation, you would check if the user already has a Stripe customer ID
    // For now, we'll create a new customer
    return this.stripeService.createCustomer({
      email: customerData.email || `user-${userId}@example.com`,
      name: customerData.name,
      metadata: {
        userId: userId,
      },
    });
  }

  /**
   * Create course purchase payment
   */
  async createCoursePurchase(data: {
    userId: string;
    courseId: string;
    amount: number;
    currency: string;
    paymentMethodId?: string;
    customerEmail?: string;
    customerName?: string;
    couponCode?: string;
  }): Promise<PaymentEntity> {
    return this.createPayment({
      userId: data.userId,
      amount: data.amount,
      currency: data.currency,
      type: PaymentType.COURSE_PURCHASE,
      courseId: data.courseId,
      description: `Course purchase`,
      paymentMethodId: data.paymentMethodId,
      customerEmail: data.customerEmail,
      customerName: data.customerName,
      couponCode: data.couponCode,
      metadata: {
        courseId: data.courseId,
      },
    });
  }

  /**
   * Create subscription payment
   */
  async createSubscriptionPayment(data: {
    userId: string;
    subscriptionId: string;
    amount: number;
    currency: string;
    paymentMethodId?: string;
    customerEmail?: string;
    customerName?: string;
    couponCode?: string;
  }): Promise<PaymentEntity> {
    return this.createPayment({
      userId: data.userId,
      amount: data.amount,
      currency: data.currency,
      type: PaymentType.SUBSCRIPTION,
      subscriptionId: data.subscriptionId,
      description: `Subscription payment`,
      paymentMethodId: data.paymentMethodId,
      customerEmail: data.customerEmail,
      customerName: data.customerName,
      couponCode: data.couponCode,
      metadata: {
        subscriptionId: data.subscriptionId,
      },
    });
  }
}
