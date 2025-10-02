import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentEntity, PaymentStatus, PaymentType } from './entities/payment.entity';
import { SubscriptionEntity, SubscriptionStatus } from './entities/subscription.entity';
import { InvoiceEntity, InvoiceStatus } from './entities/invoice.entity';

export interface PaymentAnalytics {
  totalRevenue: number;
  totalPayments: number;
  successfulPayments: number;
  failedPayments: number;
  averagePaymentAmount: number;
  revenueByPeriod: Array<{
    period: string;
    revenue: number;
    payments: number;
  }>;
  revenueByType: Array<{
    type: PaymentType;
    revenue: number;
    payments: number;
  }>;
  topPerformingProducts: Array<{
    productId: string;
    revenue: number;
    sales: number;
  }>;
}

export interface SubscriptionAnalytics {
  totalSubscriptions: number;
  activeSubscriptions: number;
  cancelledSubscriptions: number;
  trialSubscriptions: number;
  monthlyRecurringRevenue: number;
  annualRecurringRevenue: number;
  churnRate: number;
  averageSubscriptionValue: number;
  subscriptionsByPlan: Array<{
    plan: string;
    count: number;
    revenue: number;
  }>;
}

@Injectable()
export class PaymentAnalyticsService {
  private readonly logger = new Logger(PaymentAnalyticsService.name);

  constructor(
    @InjectRepository(PaymentEntity)
    private paymentRepository: Repository<PaymentEntity>,
    @InjectRepository(SubscriptionEntity)
    private subscriptionRepository: Repository<SubscriptionEntity>,
    @InjectRepository(InvoiceEntity)
    private invoiceRepository: Repository<InvoiceEntity>,
  ) {}

  /**
   * Track a payment for analytics
   */
  async trackPayment(payment: PaymentEntity): Promise<void> {
    try {
      this.logger.log(
        `Tracking payment: ${payment.id} - Amount: ${payment.amount} ${payment.currency}`,
      );

      // In a real implementation, you might want to store analytics data in a separate table
      // or send it to an analytics service like Google Analytics, Mixpanel, etc.

      // For now, we'll just log the payment for tracking
      this.logger.log(
        `Payment tracked: ${payment.id} - Status: ${payment.status} - Type: ${payment.type}`,
      );
    } catch (error) {
      this.logger.error('Failed to track payment', error);
    }
  }

  /**
   * Get payment analytics
   */
  async getPaymentAnalytics(days: number = 30): Promise<PaymentAnalytics> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get total revenue and payments
    const totalStats = await this.paymentRepository
      .createQueryBuilder('payment')
      .select([
        'SUM(payment.amount) as totalRevenue',
        'COUNT(*) as totalPayments',
        'SUM(CASE WHEN payment.status = :completedStatus THEN payment.amount ELSE 0 END) as successfulRevenue',
        'COUNT(CASE WHEN payment.status = :completedStatus THEN 1 END) as successfulPayments',
        'COUNT(CASE WHEN payment.status = :failedStatus THEN 1 END) as failedPayments',
        'AVG(payment.amount) as averagePaymentAmount',
      ])
      .where('payment.createdAt >= :startDate', { startDate })
      .setParameter('completedStatus', PaymentStatus.COMPLETED)
      .setParameter('failedStatus', PaymentStatus.FAILED)
      .getRawOne();

    // Get revenue by period (daily)
    const revenueByPeriod = await this.paymentRepository
      .createQueryBuilder('payment')
      .select([
        'DATE(payment.createdAt) as period',
        'SUM(payment.amount) as revenue',
        'COUNT(*) as payments',
      ])
      .where('payment.createdAt >= :startDate', { startDate })
      .andWhere('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .groupBy('DATE(payment.createdAt)')
      .orderBy('period', 'DESC')
      .getRawMany();

    // Get revenue by payment type
    const revenueByType = await this.paymentRepository
      .createQueryBuilder('payment')
      .select(['payment.type', 'SUM(payment.amount) as revenue', 'COUNT(*) as payments'])
      .where('payment.createdAt >= :startDate', { startDate })
      .andWhere('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .groupBy('payment.type')
      .getRawMany();

    // Get top performing products (courses)
    const topPerformingProducts = await this.paymentRepository
      .createQueryBuilder('payment')
      .select([
        'payment.courseId as productId',
        'SUM(payment.amount) as revenue',
        'COUNT(*) as sales',
      ])
      .where('payment.createdAt >= :startDate', { startDate })
      .andWhere('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .andWhere('payment.courseId IS NOT NULL')
      .groupBy('payment.courseId')
      .orderBy('revenue', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      totalRevenue: parseFloat(totalStats.totalRevenue) || 0,
      totalPayments: parseInt(totalStats.totalPayments) || 0,
      successfulPayments: parseInt(totalStats.successfulPayments) || 0,
      failedPayments: parseInt(totalStats.failedPayments) || 0,
      averagePaymentAmount: parseFloat(totalStats.averagePaymentAmount) || 0,
      revenueByPeriod: revenueByPeriod.map((item) => ({
        period: item.period,
        revenue: parseFloat(item.revenue) || 0,
        payments: parseInt(item.payments) || 0,
      })),
      revenueByType: revenueByType.map((item) => ({
        type: item.type as PaymentType,
        revenue: parseFloat(item.revenue) || 0,
        payments: parseInt(item.payments) || 0,
      })),
      topPerformingProducts: topPerformingProducts.map((item) => ({
        productId: item.productId,
        revenue: parseFloat(item.revenue) || 0,
        sales: parseInt(item.sales) || 0,
      })),
    };
  }

  /**
   * Get subscription analytics
   */
  async getSubscriptionAnalytics(): Promise<SubscriptionAnalytics> {
    // Get subscription counts by status
    const subscriptionStats = await this.subscriptionRepository
      .createQueryBuilder('subscription')
      .select(['subscription.status', 'COUNT(*) as count', 'SUM(subscription.amount) as revenue'])
      .groupBy('subscription.status')
      .getRawMany();

    // Get subscriptions by plan
    const subscriptionsByPlan = await this.subscriptionRepository
      .createQueryBuilder('subscription')
      .select(['subscription.plan', 'COUNT(*) as count', 'SUM(subscription.amount) as revenue'])
      .where('subscription.status = :status', { status: SubscriptionStatus.ACTIVE })
      .groupBy('subscription.plan')
      .getRawMany();

    // Calculate MRR and ARR
    const activeSubscriptions = await this.subscriptionRepository
      .createQueryBuilder('subscription')
      .select([
        'subscription.billingCycle',
        'SUM(subscription.amount) as totalAmount',
        'COUNT(*) as count',
      ])
      .where('subscription.status = :status', { status: SubscriptionStatus.ACTIVE })
      .groupBy('subscription.billingCycle')
      .getRawMany();

    let monthlyRecurringRevenue = 0;
    let annualRecurringRevenue = 0;

    for (const sub of activeSubscriptions) {
      const amount = parseFloat(sub.totalAmount) || 0;
      const count = parseInt(sub.count) || 0;
      const totalAmount = amount * count;

      switch (sub.billingCycle) {
        case 'monthly':
          monthlyRecurringRevenue += totalAmount;
          annualRecurringRevenue += totalAmount * 12;
          break;
        case 'quarterly':
          monthlyRecurringRevenue += totalAmount / 3;
          annualRecurringRevenue += totalAmount * 4;
          break;
        case 'yearly':
          monthlyRecurringRevenue += totalAmount / 12;
          annualRecurringRevenue += totalAmount;
          break;
      }
    }

    // Calculate churn rate (simplified)
    const totalSubscriptions = subscriptionStats.reduce(
      (sum, stat) => sum + parseInt(stat.count),
      0,
    );
    const cancelledSubscriptions = subscriptionStats.find(
      (stat) => stat.status === SubscriptionStatus.CANCELLED,
    );
    const churnRate =
      totalSubscriptions > 0
        ? (parseInt(cancelledSubscriptions?.count || '0') / totalSubscriptions) * 100
        : 0;

    // Calculate average subscription value
    const totalRevenue = subscriptionStats.reduce(
      (sum, stat) => sum + parseFloat(stat.revenue || '0'),
      0,
    );
    const averageSubscriptionValue = totalSubscriptions > 0 ? totalRevenue / totalSubscriptions : 0;

    return {
      totalSubscriptions,
      activeSubscriptions: parseInt(
        subscriptionStats.find((stat) => stat.status === SubscriptionStatus.ACTIVE)?.count || '0',
      ),
      cancelledSubscriptions: parseInt(
        subscriptionStats.find((stat) => stat.status === SubscriptionStatus.CANCELLED)?.count ||
          '0',
      ),
      trialSubscriptions: parseInt(
        subscriptionStats.find((stat) => stat.status === SubscriptionStatus.TRIAL)?.count || '0',
      ),
      monthlyRecurringRevenue,
      annualRecurringRevenue,
      churnRate,
      averageSubscriptionValue,
      subscriptionsByPlan: subscriptionsByPlan.map((item) => ({
        plan: item.plan,
        count: parseInt(item.count) || 0,
        revenue: parseFloat(item.revenue) || 0,
      })),
    };
  }

  /**
   * Get invoice analytics
   */
  async getInvoiceAnalytics(days: number = 30): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const invoiceStats = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .select([
        'invoice.status',
        'COUNT(*) as count',
        'SUM(invoice.total) as totalAmount',
        'AVG(invoice.total) as averageAmount',
      ])
      .where('invoice.createdAt >= :startDate', { startDate })
      .groupBy('invoice.status')
      .getRawMany();

    const overdueInvoices = await this.getOverdueInvoices();

    return {
      totalInvoices: invoiceStats.reduce((sum, stat) => sum + parseInt(stat.count), 0),
      paidInvoices: parseInt(
        invoiceStats.find((stat) => stat.status === InvoiceStatus.PAID)?.count || '0',
      ),
      overdueInvoices: overdueInvoices.length,
      totalInvoiceAmount: invoiceStats.reduce(
        (sum, stat) => sum + parseFloat(stat.totalAmount || '0'),
        0,
      ),
      averageInvoiceAmount:
        invoiceStats.reduce((sum, stat) => sum + parseFloat(stat.averageAmount || '0'), 0) /
        invoiceStats.length,
      invoiceStats: invoiceStats.map((stat) => ({
        status: stat.status,
        count: parseInt(stat.count) || 0,
        totalAmount: parseFloat(stat.totalAmount) || 0,
        averageAmount: parseFloat(stat.averageAmount) || 0,
      })),
    };
  }

  /**
   * Get revenue trends
   */
  async getRevenueTrends(days: number = 90): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const revenueTrends = await this.paymentRepository
      .createQueryBuilder('payment')
      .select([
        'DATE(payment.createdAt) as date',
        'SUM(payment.amount) as revenue',
        'COUNT(*) as transactions',
      ])
      .where('payment.createdAt >= :startDate', { startDate })
      .andWhere('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .groupBy('DATE(payment.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany();

    return {
      period: `${days} days`,
      totalRevenue: revenueTrends.reduce((sum, item) => sum + parseFloat(item.revenue || '0'), 0),
      totalTransactions: revenueTrends.reduce(
        (sum, item) => sum + parseInt(item.transactions || '0'),
        0,
      ),
      trends: revenueTrends.map((item) => ({
        date: item.date,
        revenue: parseFloat(item.revenue) || 0,
        transactions: parseInt(item.transactions) || 0,
      })),
    };
  }

  /**
   * Get customer analytics
   */
  async getCustomerAnalytics(): Promise<any> {
    const customerStats = await this.paymentRepository
      .createQueryBuilder('payment')
      .select([
        'payment.userId',
        'COUNT(*) as totalPayments',
        'SUM(payment.amount) as totalSpent',
        'MAX(payment.createdAt) as lastPayment',
        'MIN(payment.createdAt) as firstPayment',
      ])
      .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .groupBy('payment.userId')
      .orderBy('totalSpent', 'DESC')
      .limit(100)
      .getRawMany();

    const averageCustomerValue =
      customerStats.length > 0
        ? customerStats.reduce((sum, customer) => sum + parseFloat(customer.totalSpent || '0'), 0) /
          customerStats.length
        : 0;

    return {
      totalCustomers: customerStats.length,
      averageCustomerValue,
      topCustomers: customerStats.slice(0, 10).map((customer) => ({
        userId: customer.userId,
        totalPayments: parseInt(customer.totalPayments) || 0,
        totalSpent: parseFloat(customer.totalSpent) || 0,
        lastPayment: customer.lastPayment,
        firstPayment: customer.firstPayment,
      })),
    };
  }

  /**
   * Get business intelligence dashboard data
   */
  async getBusinessIntelligence(): Promise<any> {
    const [
      paymentAnalytics,
      subscriptionAnalytics,
      invoiceAnalytics,
      revenueTrends,
      customerAnalytics,
    ] = await Promise.all([
      this.getPaymentAnalytics(30),
      this.getSubscriptionAnalytics(),
      this.getInvoiceAnalytics(30),
      this.getRevenueTrends(30),
      this.getCustomerAnalytics(),
    ]);

    return {
      paymentAnalytics,
      subscriptionAnalytics,
      invoiceAnalytics,
      revenueTrends,
      customerAnalytics,
      summary: {
        totalRevenue: paymentAnalytics.totalRevenue,
        activeSubscriptions: subscriptionAnalytics.activeSubscriptions,
        monthlyRecurringRevenue: subscriptionAnalytics.monthlyRecurringRevenue,
        totalCustomers: customerAnalytics.totalCustomers,
        averageCustomerValue: customerAnalytics.averageCustomerValue,
      },
    };
  }

  /**
   * Get overdue invoices
   */
  private async getOverdueInvoices(): Promise<InvoiceEntity[]> {
    const now = new Date();
    return this.invoiceRepository
      .createQueryBuilder('invoice')
      .where('invoice.dueDate <= :now', { now })
      .andWhere('invoice.status = :status', { status: InvoiceStatus.OPEN })
      .getMany();
  }
}
