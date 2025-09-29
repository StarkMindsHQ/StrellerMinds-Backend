import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionEntity, SubscriptionStatus, SubscriptionPlan, BillingCycle } from './entities/subscription.entity';
import { StripeService } from './stripe.service';
import { PaymentService } from './payment.service';
import { InvoiceService } from './invoice.service';

export interface CreateSubscriptionDto {
  userId: string;
  plan: SubscriptionPlan;
  billingCycle: BillingCycle;
  amount: number;
  currency: string;
  paymentMethodId?: string;
  trialDays?: number;
  customerEmail?: string;
  customerName?: string;
  couponCode?: string;
  metadata?: Record<string, any>;
}

export interface UpdateSubscriptionDto {
  subscriptionId: string;
  plan?: SubscriptionPlan;
  billingCycle?: BillingCycle;
  amount?: number;
  paymentMethodId?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    @InjectRepository(SubscriptionEntity)
    private subscriptionRepository: Repository<SubscriptionEntity>,
    private stripeService: StripeService,
    private paymentService: PaymentService,
    private invoiceService: InvoiceService,
  ) {}

  /**
   * Create a new subscription
   */
  async createSubscription(data: CreateSubscriptionDto): Promise<SubscriptionEntity> {
    try {
      // Create or get Stripe customer
      const customer = await this.getOrCreateStripeCustomer(data.userId, {
        email: data.customerEmail,
        name: data.customerName,
      });

      // Create product and price in Stripe
      const product = await this.stripeService.createProduct({
        name: `${data.plan} Plan`,
        description: `Subscription for ${data.plan} plan`,
        metadata: {
          plan: data.plan,
          billingCycle: data.billingCycle,
        },
      });

      const price = await this.stripeService.createPrice({
        unitAmount: data.amount,
        currency: data.currency,
        recurring: {
          interval: this.getStripeInterval(data.billingCycle),
        },
        productId: product.id,
        nickname: `${data.plan} - ${data.billingCycle}`,
        metadata: {
          plan: data.plan,
          billingCycle: data.billingCycle,
        },
      });

      // Create subscription in Stripe
      const stripeSubscription = await this.stripeService.createSubscription({
        customerId: customer.id,
        priceId: price.id,
        paymentMethodId: data.paymentMethodId,
        trialDays: data.trialDays,
        metadata: {
          ...data.metadata,
          userId: data.userId,
          plan: data.plan,
          billingCycle: data.billingCycle,
        },
      });

      // Create subscription record in database
      const subscription = this.subscriptionRepository.create({
        userId: data.userId,
        stripeSubscriptionId: stripeSubscription.id,
        stripeCustomerId: customer.id,
        status: this.mapStripeStatus(stripeSubscription.status),
        plan: data.plan,
        billingCycle: data.billingCycle,
        amount: data.amount,
        currency: data.currency,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        trialStart: stripeSubscription.trial_start 
          ? new Date(stripeSubscription.trial_start * 1000) 
          : undefined,
        trialEnd: stripeSubscription.trial_end 
          ? new Date(stripeSubscription.trial_end * 1000) 
          : undefined,
        features: this.getPlanFeatures(data.plan),
        metadata: data.metadata,
        couponCode: data.couponCode,
        nextBillingDate: new Date(stripeSubscription.current_period_end * 1000),
      });

      const savedSubscription = await this.subscriptionRepository.save(subscription);

      this.logger.log(`Created subscription: ${savedSubscription.id}`);
      return savedSubscription;
    } catch (error) {
      this.logger.error('Failed to create subscription', error);
      throw error;
    }
  }

  /**
   * Get subscription by ID
   */
  async getSubscriptionById(subscriptionId: string): Promise<SubscriptionEntity> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
      relations: ['user', 'payments'],
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription not found: ${subscriptionId}`);
    }

    return subscription;
  }

  /**
   * Get subscription by Stripe subscription ID
   */
  async getSubscriptionByStripeId(stripeSubscriptionId: string): Promise<SubscriptionEntity> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId },
      relations: ['user', 'payments'],
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription not found for Stripe ID: ${stripeSubscriptionId}`);
    }

    return subscription;
  }

  /**
   * Get active subscription by user ID
   */
  async getActiveSubscriptionByUserId(userId: string): Promise<SubscriptionEntity | null> {
    return this.subscriptionRepository.findOne({
      where: { 
        userId,
        status: SubscriptionStatus.ACTIVE,
      },
      relations: ['user', 'payments'],
    });
  }

  /**
   * Get all subscriptions by user ID
   */
  async getSubscriptionsByUserId(userId: string): Promise<SubscriptionEntity[]> {
    return this.subscriptionRepository.find({
      where: { userId },
      relations: ['user', 'payments'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd: boolean = true,
    reason?: string,
  ): Promise<SubscriptionEntity> {
    try {
      const subscription = await this.getSubscriptionById(subscriptionId);

      if (subscription.status === SubscriptionStatus.CANCELLED) {
        throw new BadRequestException('Subscription is already cancelled');
      }

      // Cancel subscription in Stripe
      const stripeSubscription = await this.stripeService.cancelSubscription(
        subscription.stripeSubscriptionId,
        cancelAtPeriodEnd,
      );

      // Update subscription record
      subscription.status = SubscriptionStatus.CANCELLED;
      subscription.cancelledAt = new Date();
      subscription.cancelAtPeriodEnd = cancelAtPeriodEnd;
      subscription.cancelReason = reason;

      const updatedSubscription = await this.subscriptionRepository.save(subscription);

      this.logger.log(`Cancelled subscription: ${subscriptionId}`);
      return updatedSubscription;
    } catch (error) {
      this.logger.error('Failed to cancel subscription', error);
      throw error;
    }
  }

  /**
   * Update subscription
   */
  async updateSubscription(data: UpdateSubscriptionDto): Promise<SubscriptionEntity> {
    try {
      const subscription = await this.getSubscriptionById(data.subscriptionId);

      // Update subscription in Stripe
      const stripeSubscription = await this.stripeService.getSubscription(subscription.stripeSubscriptionId);

      // Update local subscription record
      if (data.plan) subscription.plan = data.plan;
      if (data.billingCycle) subscription.billingCycle = data.billingCycle;
      if (data.amount) subscription.amount = data.amount;
      if (data.metadata) subscription.metadata = data.metadata;

      // Update features if plan changed
      if (data.plan) {
        subscription.features = this.getPlanFeatures(data.plan);
      }

      const updatedSubscription = await this.subscriptionRepository.save(subscription);

      this.logger.log(`Updated subscription: ${data.subscriptionId}`);
      return updatedSubscription;
    } catch (error) {
      this.logger.error('Failed to update subscription', error);
      throw error;
    }
  }

  /**
   * Reactivate a cancelled subscription
   */
  async reactivateSubscription(subscriptionId: string): Promise<SubscriptionEntity> {
    try {
      const subscription = await this.getSubscriptionById(subscriptionId);

      if (subscription.status !== SubscriptionStatus.CANCELLED) {
        throw new BadRequestException('Only cancelled subscriptions can be reactivated');
      }

      // Reactivate subscription in Stripe
      const stripeSubscription = await this.stripeService.getSubscription(subscription.stripeSubscriptionId);

      // Update subscription record
      subscription.status = SubscriptionStatus.ACTIVE;
      subscription.cancelledAt = undefined;
      subscription.cancelAtPeriodEnd = false;
      subscription.cancelReason = undefined;

      const updatedSubscription = await this.subscriptionRepository.save(subscription);

      this.logger.log(`Reactivated subscription: ${subscriptionId}`);
      return updatedSubscription;
    } catch (error) {
      this.logger.error('Failed to reactivate subscription', error);
      throw error;
    }
  }

  /**
   * Update subscription from webhook
   */
  async updateSubscriptionFromWebhook(
    stripeSubscriptionId: string,
    status: SubscriptionStatus,
  ): Promise<SubscriptionEntity> {
    const subscription = await this.getSubscriptionByStripeId(stripeSubscriptionId);

    subscription.status = status;

    // Update billing dates if available
    const stripeSubscription = await this.stripeService.getSubscription(stripeSubscriptionId);
    subscription.currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
    subscription.currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);
    subscription.nextBillingDate = new Date(stripeSubscription.current_period_end * 1000);

    const updatedSubscription = await this.subscriptionRepository.save(subscription);

    this.logger.log(`Updated subscription from webhook: ${subscription.id} - Status: ${status}`);
    return updatedSubscription;
  }

  /**
   * Get subscription statistics
   */
  async getSubscriptionStats(): Promise<any> {
    const stats = await this.subscriptionRepository
      .createQueryBuilder('subscription')
      .select([
        'subscription.status',
        'subscription.plan',
        'subscription.billingCycle',
        'COUNT(*) as count',
        'SUM(subscription.amount) as total_amount',
      ])
      .groupBy('subscription.status, subscription.plan, subscription.billingCycle')
      .getRawMany();

    return stats;
  }

  /**
   * Get expiring subscriptions
   */
  async getExpiringSubscriptions(days: number = 7): Promise<SubscriptionEntity[]> {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);

    return this.subscriptionRepository
      .createQueryBuilder('subscription')
      .where('subscription.currentPeriodEnd <= :expiryDate', { expiryDate })
      .andWhere('subscription.status = :status', { status: SubscriptionStatus.ACTIVE })
      .getMany();
  }

  /**
   * Get trial subscriptions
   */
  async getTrialSubscriptions(): Promise<SubscriptionEntity[]> {
    return this.subscriptionRepository.find({
      where: { status: SubscriptionStatus.TRIAL },
      relations: ['user'],
    });
  }

  /**
   * Get or create Stripe customer
   */
  private async getOrCreateStripeCustomer(userId: string, customerData: {
    email?: string;
    name?: string;
  }): Promise<any> {
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
   * Map Stripe subscription status to our enum
   */
  private mapStripeStatus(stripeStatus: string): SubscriptionStatus {
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

  /**
   * Get Stripe interval from billing cycle
   */
  private getStripeInterval(billingCycle: BillingCycle): 'day' | 'week' | 'month' | 'year' {
    switch (billingCycle) {
      case BillingCycle.MONTHLY:
        return 'month';
      case BillingCycle.QUARTERLY:
        return 'month';
      case BillingCycle.YEARLY:
        return 'year';
      default:
        return 'month';
    }
  }

  /**
   * Get plan features
   */
  private getPlanFeatures(plan: SubscriptionPlan): Record<string, any> {
    const features = {
      [SubscriptionPlan.BASIC]: {
        maxCourses: 5,
        maxStudents: 100,
        storage: '1GB',
        support: 'email',
        certificates: false,
        analytics: false,
      },
      [SubscriptionPlan.PREMIUM]: {
        maxCourses: 20,
        maxStudents: 500,
        storage: '10GB',
        support: 'priority',
        certificates: true,
        analytics: true,
      },
      [SubscriptionPlan.ENTERPRISE]: {
        maxCourses: -1, // unlimited
        maxStudents: -1, // unlimited
        storage: '100GB',
        support: 'dedicated',
        certificates: true,
        analytics: true,
        customBranding: true,
        apiAccess: true,
      },
      [SubscriptionPlan.STUDENT]: {
        maxCourses: 2,
        maxStudents: 50,
        storage: '500MB',
        support: 'community',
        certificates: false,
        analytics: false,
      },
    };

    return features[plan] || features[SubscriptionPlan.BASIC];
  }
} 