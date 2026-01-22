import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
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
import {
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  CancelSubscriptionDto,
} from '../dto';
import { StripeService } from './stripe.service';
import { PayPalService } from './paypal.service';

@Injectable()
export class SubscriptionService {
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

  async createSubscription(
    userId: string,
    dto: CreateSubscriptionDto,
  ): Promise<Subscription> {
    const plan = await this.paymentPlanRepository.findOneBy({
      id: dto.paymentPlanId,
    });

    if (!plan) {
      throw new NotFoundException('Payment plan not found');
    }

    const subscription = this.subscriptionRepository.create({
      userId,
      paymentPlanId: plan.id,
      billingCycle: dto.billingCycle || plan.billingCycle,
      status: SubscriptionStatus.PENDING,
      startDate: new Date(),
      currentAmount: plan.price,
      metadata: dto.metadata,
    });

    const savedSubscription = await this.subscriptionRepository.save(subscription);

    // Calculate next billing date
    const nextBillingDate = this.calculateNextBillingDate(
      new Date(),
      savedSubscription.billingCycle,
    );
    savedSubscription.nextBillingDate = nextBillingDate;

    return this.subscriptionRepository.save(savedSubscription);
  }

  async getSubscription(subscriptionId: string): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
      relations: ['paymentPlan', 'user'],
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return subscription;
  }

  async getUserSubscriptions(userId: string): Promise<Subscription[]> {
    return this.subscriptionRepository.find({
      where: { userId },
      relations: ['paymentPlan'],
      order: { createdAt: 'DESC' },
    });
  }

  async updateSubscription(
    subscriptionId: string,
    dto: UpdateSubscriptionDto,
  ): Promise<Subscription> {
    const subscription = await this.getSubscription(subscriptionId);

    if (dto.status) {
      subscription.status = dto.status;
    }

    if (dto.billingCycle) {
      subscription.billingCycle = dto.billingCycle;
      subscription.nextBillingDate = this.calculateNextBillingDate(
        new Date(),
        dto.billingCycle,
      );
    }

    if (dto.metadata) {
      subscription.metadata = { ...subscription.metadata, ...dto.metadata };
    }

    return this.subscriptionRepository.save(subscription);
  }

  async cancelSubscription(
    subscriptionId: string,
    dto: CancelSubscriptionDto,
  ): Promise<Subscription> {
    const subscription = await this.getSubscription(subscriptionId);

    subscription.status = SubscriptionStatus.CANCELLED;
    subscription.cancelledAt = new Date();
    subscription.cancellationReason = dto.reason;
    subscription.endDate = new Date();

    return this.subscriptionRepository.save(subscription);
  }

  async pauseSubscription(subscriptionId: string): Promise<Subscription> {
    const subscription = await this.getSubscription(subscriptionId);
    subscription.status = SubscriptionStatus.PAUSED;
    return this.subscriptionRepository.save(subscription);
  }

  async resumeSubscription(subscriptionId: string): Promise<Subscription> {
    const subscription = await this.getSubscription(subscriptionId);

    if (subscription.status !== SubscriptionStatus.PAUSED) {
      throw new BadRequestException('Only paused subscriptions can be resumed');
    }

    subscription.status = SubscriptionStatus.ACTIVE;
    subscription.nextBillingDate = this.calculateNextBillingDate(
      new Date(),
      subscription.billingCycle,
    );

    return this.subscriptionRepository.save(subscription);
  }

  async processRecurringBillings(): Promise<void> {
    const today = new Date();

    const subscriptions = await this.subscriptionRepository.find({
      where: {
        status: SubscriptionStatus.ACTIVE,
      },
      relations: ['paymentPlan', 'user'],
    });

    for (const subscription of subscriptions) {
      if (
        subscription.nextBillingDate &&
        subscription.nextBillingDate <= today
      ) {
        await this.processBilling(subscription);
      }
    }
  }

  private async processBilling(subscription: Subscription): Promise<void> {
    try {
      // Create invoice
      const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      const invoice = this.invoiceRepository.create({
        invoiceNumber,
        userId: subscription.userId,
        subscriptionId: subscription.id,
        subtotal: subscription.currentAmount,
        total: subscription.currentAmount,
        status: InvoiceStatus.ISSUED,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        lineItems: [
          {
            description: `Subscription - ${subscription.paymentPlan.name}`,
            quantity: 1,
            unitPrice: subscription.currentAmount,
            total: subscription.currentAmount,
          },
        ],
      });

      await this.invoiceRepository.save(invoice);

      // Update next billing date
      subscription.nextBillingDate = this.calculateNextBillingDate(
        subscription.nextBillingDate,
        subscription.billingCycle,
      );

      await this.subscriptionRepository.save(subscription);
    } catch (error) {
      subscription.failedPaymentCount++;
      await this.subscriptionRepository.save(subscription);
    }
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
