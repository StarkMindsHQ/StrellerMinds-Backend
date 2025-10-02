import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/services/users.service';
import { SubscriptionService } from '../payment/subscription.service';
import { StripeService } from '../payment/stripe.service';
import { SubscriptionPlan, BillingCycle } from '../payment/entities/subscription.entity';
import { TIERS, TierKey } from './tier.config';
import { AuditLogService } from 'src/audit/services/audit.log.service';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly subscriptionService: SubscriptionService,
    private readonly stripeService: StripeService,
    private readonly config: ConfigService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async ensureStripeCustomer(userId: string, email?: string, name?: string): Promise<string> {
    const user = await this.usersService.findOne(userId);
    if (user.stripeCustomerId) return user.stripeCustomerId;

    const customer = await this.stripeService.createCustomer({ email: email || user.email, name });
    await this.usersService.updateStripeCustomerId(userId, customer.id);
    return customer.id;
  }

  async startSubscription(params: {
    userId: string;
    plan: SubscriptionPlan | TierKey;
    billingCycle: BillingCycle;
    seats?: number;
    trialDays?: number;
    priceIdOverride?: string;
  }) {
    const user = await this.usersService.findOne(params.userId);
    const customerId = await this.ensureStripeCustomer(
      user.id,
      user.email,
      `${user.firstName} ${user.lastName}`,
    );

    const tierKey = (
      typeof params.plan === 'string' ? params.plan : String(params.plan)
    ) as TierKey;
    const tier = TIERS[tierKey] || TIERS.premium;

    const priceId =
      params.priceIdOverride ||
      (params.billingCycle === BillingCycle.YEARLY ? tier.priceIdYearly : tier.priceIdMonthly);
    if (!priceId)
      throw new BadRequestException('No Stripe price configured for selected plan/cycle');

    const subscription = await this.subscriptionService.createSubscription({
      userId: user.id,
      plan: (SubscriptionPlan as any)[tierKey.toUpperCase()] ?? SubscriptionPlan.PREMIUM,
      billingCycle: params.billingCycle,
      amount: 0,
      currency: 'usd',
      trialDays: params.trialDays,
      paymentMethodId: undefined,
      customerEmail: user.email,
      customerName: `${user.firstName} ${user.lastName}`,
      metadata: { seats: params.seats || tier.defaultSeats || 1 },
      priceId: priceId!,
      quantity: params.seats || tier.defaultSeats || 1,
    } as any);

    // Note: StripeService.createSubscription already called inside subscriptionService
    this.logger.log(`Started subscription ${subscription.id} for user ${user.id}`);
    await this.auditLogService.createLog({
      action: 'SUBSCRIPTION_STARTED',
      entityType: 'Subscription',
      entityId: subscription.id,
      performedBy: user.id,
      details: {
        plan: tierKey,
        billingCycle: params.billingCycle,
        customerId,
        seats: params.seats,
      },
    });
    return subscription;
  }

  async cancelSubscription(params: {
    subscriptionId: string;
    cancelAtPeriodEnd?: boolean;
    reason?: string;
  }) {
    const sub = await this.subscriptionService.cancelSubscription(
      params.subscriptionId,
      params.cancelAtPeriodEnd ?? true,
      params.reason,
    );
    await this.auditLogService.createLog({
      action: 'SUBSCRIPTION_CANCELLED',
      entityType: 'Subscription',
      entityId: params.subscriptionId,
      performedBy: sub.userId,
      details: { cancelAtPeriodEnd: params.cancelAtPeriodEnd, reason: params.reason },
    });
    return sub;
  }

  async createPortalSession(userId: string, returnUrl?: string) {
    const user = await this.usersService.findOne(userId);
    if (!user.stripeCustomerId) throw new BadRequestException('User not linked to Stripe');
    const url =
      returnUrl ||
      this.config.get<string>('BILLING_PORTAL_RETURN_URL') ||
      'https://app.strellerminds.com/account/billing';
    const session = await this.stripeService.createBillingPortalSession({
      customerId: user.stripeCustomerId,
      returnUrl: url,
    });
    await this.auditLogService.createLog({
      action: 'BILLING_PORTAL_SESSION_CREATED',
      entityType: 'User',
      entityId: userId,
      performedBy: userId,
      details: { sessionId: session.id },
    });
    return { url: session.url };
  }

  async getMySubscription(userId: string) {
    return this.subscriptionService.getActiveSubscriptionByUserId(userId);
  }
}
