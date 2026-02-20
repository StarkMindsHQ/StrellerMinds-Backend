import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Subscription,
  PaymentPlan,
  Invoice,
  Payment,
} from '../entities';
import {
  SubscriptionStatus,
  BillingCycle,
  PaymentStatus,
  InvoiceStatus,
} from '../enums';
import { CreateSubscriptionDto, UpdateSubscriptionDto } from '../dto';
import { StripeService } from './stripe.service';
import { PayPalService } from './paypal.service';

@Injectable()
export class AdvancedSubscriptionService {
  constructor(
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(PaymentPlan)
    private paymentPlanRepository: Repository<PaymentPlan>,
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    private stripeService: StripeService,
    private paypalService: PayPalService,
  ) {}

  async upgradeSubscription(
    subscriptionId: string,
    newPlanId: string,
    prorate: boolean = true,
    immediate: boolean = true,
  ): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
      relations: ['paymentPlan'],
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new BadRequestException('Only active subscriptions can be upgraded');
    }

    const newPlan = await this.paymentPlanRepository.findOneBy({
      id: newPlanId,
      isActive: true,
    });

    if (!newPlan) {
      throw new NotFoundException('New payment plan not found');
    }

    // Check if it's actually an upgrade (higher price)
    if (newPlan.price < subscription.currentAmount) {
      throw new BadRequestException('Use downgrade endpoint for downgrades');
    }

    let prorationAmount = 0;
    if (prorate && subscription.nextBillingDate) {
      prorationAmount = this.calculateProrationAmount(
        subscription,
        newPlan,
        subscription.nextBillingDate,
      );
    }

    // Create proration invoice if needed
    if (prorationAmount > 0) {
      await this.createProrationInvoice(
        subscription.userId,
        subscriptionId,
        prorationAmount,
        `Upgrade from ${subscription.paymentPlan.name} to ${newPlan.name}`,
      );
    }

    // Update subscription
    subscription.paymentPlanId = newPlan.id;
    subscription.currentAmount = newPlan.price;
    
    if (immediate) {
      subscription.nextBillingDate = this.calculateNextBillingDate(
        new Date(),
        newPlan.billingCycle,
      );
    }

    return this.subscriptionRepository.save(subscription);
  }

  async downgradeSubscription(
    subscriptionId: string,
    newPlanId: string,
    effectiveAtPeriodEnd: boolean = true,
  ): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
      relations: ['paymentPlan'],
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new BadRequestException('Only active subscriptions can be downgraded');
    }

    const newPlan = await this.paymentPlanRepository.findOneBy({
      id: newPlanId,
      isActive: true,
    });

    if (!newPlan) {
      throw new NotFoundException('New payment plan not found');
    }

    // Check if it's actually a downgrade (lower price)
    if (newPlan.price >= subscription.currentAmount) {
      throw new BadRequestException('Use upgrade endpoint for upgrades');
    }

    if (effectiveAtPeriodEnd) {
      // Schedule downgrade for next billing cycle
      subscription.metadata = {
        ...subscription.metadata,
        scheduledDowngradeTo: newPlan.id,
        scheduledDowngradeAt: subscription.nextBillingDate,
      };
    } else {
      // Immediate downgrade
      subscription.paymentPlanId = newPlan.id;
      subscription.currentAmount = newPlan.price;
    }

    return this.subscriptionRepository.save(subscription);
  }

  async processScheduledDowngrades(): Promise<void> {
    const subscriptions = await this.subscriptionRepository
      .createQueryBuilder('subscription')
      .where('subscription.metadata::jsonb ? :key', { key: 'scheduledDowngradeTo' })
      .getMany();

    const now = new Date();

    for (const subscription of subscriptions) {
      const scheduledDowngradeAt = new Date(
        subscription.metadata.scheduledDowngradeAt,
      );

      if (scheduledDowngradeAt <= now) {
        const newPlanId = subscription.metadata.scheduledDowngradeTo;
        
        const newPlan = await this.paymentPlanRepository.findOneBy({
          id: newPlanId,
          isActive: true,
        });

        if (newPlan) {
          subscription.paymentPlanId = newPlanId;
          subscription.currentAmount = newPlan.price;
          
          // Remove schedule metadata
          const { scheduledDowngradeTo, scheduledDowngradeAt, ...rest } = subscription.metadata;
          subscription.metadata = rest;
          
          await this.subscriptionRepository.save(subscription);
        }
      }
    }
  }

  async startFreeTrial(
    userId: string,
    planId: string,
    trialDays: number,
  ): Promise<Subscription> {
    const plan = await this.paymentPlanRepository.findOneBy({
      id: planId,
      isActive: true,
    });

    if (!plan) {
      throw new NotFoundException('Payment plan not found');
    }

    if (!plan.trialDays && !trialDays) {
      throw new BadRequestException('Plan does not support trials');
    }

    // Check if user already has an active trial
    const existingTrial = await this.subscriptionRepository.findOne({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
        paymentPlanId: planId,
      },
    });

    if (existingTrial) {
      throw new BadRequestException('User already has an active subscription to this plan');
    }

    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + (trialDays || plan.trialDays));

    const subscription = this.subscriptionRepository.create({
      userId,
      paymentPlanId: plan.id,
      billingCycle: plan.billingCycle,
      status: SubscriptionStatus.ACTIVE,
      startDate: new Date(),
      currentAmount: 0, // Free during trial
      nextBillingDate: trialEnd,
      metadata: {
        isTrial: true,
        trialEnd: trialEnd.toISOString(),
        originalPlanPrice: plan.price,
      },
    });

    return this.subscriptionRepository.save(subscription);
  }

  async cancelSubscription(
    subscriptionId: string,
    reason: string,
    immediate: boolean = false,
  ): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
      relations: ['paymentPlan'],
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new BadRequestException('Only active subscriptions can be cancelled');
    }

    if (immediate) {
      subscription.status = SubscriptionStatus.CANCELLED;
      subscription.cancelledAt = new Date();
      subscription.endDate = new Date();
    } else {
      // Schedule cancellation at period end
      subscription.metadata = {
        ...subscription.metadata,
        scheduledCancellation: true,
        cancellationReason: reason,
        scheduledCancellationAt: subscription.nextBillingDate,
      };
    }

    subscription.cancellationReason = reason;
    return this.subscriptionRepository.save(subscription);
  }

  async processScheduledCancellations(): Promise<void> {
    const subscriptions = await this.subscriptionRepository
      .createQueryBuilder('subscription')
      .where('subscription.metadata::jsonb ? :key', { key: 'scheduledCancellation' })
      .getMany();

    const now = new Date();

    for (const subscription of subscriptions) {
      const scheduledCancellationAt = new Date(
        subscription.metadata.scheduledCancellationAt,
      );

      if (scheduledCancellationAt <= now) {
        subscription.status = SubscriptionStatus.CANCELLED;
        subscription.cancelledAt = new Date();
        subscription.endDate = new Date();
        
        // Remove schedule metadata
        const { scheduledCancellation, cancellationReason, scheduledCancellationAt, ...rest } = subscription.metadata;
        subscription.metadata = rest;
        
        await this.subscriptionRepository.save(subscription);
      }
    }
  }

  async reactivateSubscription(subscriptionId: string): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
      relations: ['paymentPlan'],
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.status !== SubscriptionStatus.CANCELLED) {
      throw new BadRequestException('Only cancelled subscriptions can be reactivated');
    }

    // Check if the plan is still active
    const plan = await this.paymentPlanRepository.findOneBy({
      id: subscription.paymentPlanId,
      isActive: true,
    });

    if (!plan) {
      throw new BadRequestException('Original payment plan is no longer available');
    }

    subscription.status = SubscriptionStatus.ACTIVE;
    subscription.cancelledAt = null;
    subscription.endDate = null;
    subscription.cancellationReason = null;
    subscription.nextBillingDate = this.calculateNextBillingDate(
      new Date(),
      plan.billingCycle,
    );
    subscription.currentAmount = plan.price;

    return this.subscriptionRepository.save(subscription);
  }

  private calculateProrationAmount(
    subscription: Subscription,
    newPlan: PaymentPlan,
    nextBillingDate: Date,
  ): number {
    const now = new Date();
    const periodEnd = nextBillingDate;
    const periodStart = this.getPeriodStart(subscription, periodEnd);
    
    const daysInPeriod = Math.ceil(
      (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24),
    );
    const daysRemaining = Math.ceil(
      (periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    
    const oldDailyRate = subscription.currentAmount / daysInPeriod;
    const newDailyRate = newPlan.price / daysInPeriod;
    
    return (newDailyRate - oldDailyRate) * daysRemaining;
  }

  private getPeriodStart(
    subscription: Subscription,
    periodEnd: Date,
  ): Date {
    // This is a simplified calculation - in production, you'd want to track
    // the actual period start date
    const periodStart = new Date(periodEnd);
    switch (subscription.billingCycle) {
      case BillingCycle.MONTHLY:
        periodStart.setMonth(periodStart.getMonth() - 1);
        break;
      case BillingCycle.QUARTERLY:
        periodStart.setMonth(periodStart.getMonth() - 3);
        break;
      case BillingCycle.SEMI_ANNUAL:
        periodStart.setMonth(periodStart.getMonth() - 6);
        break;
      case BillingCycle.ANNUAL:
        periodStart.setFullYear(periodStart.getFullYear() - 1);
        break;
    }
    return periodStart;
  }

  private async createProrationInvoice(
    userId: string,
    subscriptionId: string,
    amount: number,
    description: string,
  ): Promise<Invoice> {
    const invoiceNumber = `PRORATE-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    const invoice = this.invoiceRepository.create({
      invoiceNumber,
      userId,
      subscriptionId,
      subtotal: Math.abs(amount),
      tax: 0,
      discount: 0,
      total: Math.abs(amount),
      currency: 'USD',
      status: InvoiceStatus.ISSUED,
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      lineItems: [
        {
          description,
          quantity: 1,
          unitPrice: Math.abs(amount),
          total: Math.abs(amount),
        },
      ],
      metadata: {
        isProration: true,
        prorationAmount: amount,
      },
    });

    return this.invoiceRepository.save(invoice);
  }

  private calculateNextBillingDate(
    from: Date,
    cycle: BillingCycle,
  ): Date {
    const date = new Date(from);

    switch (cycle) {
      case BillingCycle.MONTHLY:
        date.setMonth(date.getMonth() + 1);
        break;
      case BillingCycle.QUARTERLY:
        date.setMonth(date.getMonth() + 3);
        break;
      case BillingCycle.SEMI_ANNUAL:
        date.setMonth(date.getMonth() + 6);
        break;
      case BillingCycle.ANNUAL:
        date.setFullYear(date.getFullYear() + 1);
        break;
    }

    return date;
  }
}