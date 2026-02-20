import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Invoice, Subscription, PaymentPlan, Payment } from '../entities';
import { InvoiceStatus, SubscriptionStatus } from '../enums';
import { CreateInvoiceDto, UpdateInvoiceDto, SendInvoiceDto } from '../dto';
import { TaxCalculationService } from './tax-calculation.service';

@Injectable()
export class EnhancedInvoiceService {
  constructor(
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    private taxCalculationService: TaxCalculationService,
  ) {}

  async createRecurringInvoice(
    subscriptionId: string,
    userId: string,
    description?: string,
  ): Promise<Invoice> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId, userId },
      relations: ['paymentPlan'],
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new BadRequestException('Only active subscriptions can generate invoices');
    }

    // Check if an invoice already exists for this billing period
    const existingInvoice = await this.invoiceRepository.findOne({
      where: {
        subscriptionId,
        createdAt: Between(
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          new Date(),
        ),
      },
    });

    if (existingInvoice) {
      throw new BadRequestException('Invoice already exists for this billing period');
    }

    // Calculate tax
    const taxCalculation = await this.taxCalculationService.calculateTax({
      amount: subscription.currentAmount,
      country: 'US', // This should come from user's location
      currency: 'USD',
    });

    const invoiceNumber = this.generateInvoiceNumber();
    
    const invoice = this.invoiceRepository.create({
      invoiceNumber,
      userId,
      subscriptionId,
      subtotal: subscription.currentAmount,
      tax: taxCalculation.tax,
      discount: 0,
      total: taxCalculation.total,
      currency: 'USD',
      status: InvoiceStatus.ISSUED,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      notes: description || `Subscription payment for ${subscription.paymentPlan.name}`,
      lineItems: [
        {
          description: `Subscription - ${subscription.paymentPlan.name}`,
          quantity: 1,
          unitPrice: subscription.currentAmount,
          total: subscription.currentAmount,
        },
      ],
      metadata: {
        subscriptionId: subscription.id,
        billingCycle: subscription.billingCycle,
        isRecurring: true,
        taxRate: taxCalculation.rate,
      },
    });

    return this.invoiceRepository.save(invoice);
  }

  async processRecurringInvoices(): Promise<void> {
    const today = new Date();
    
    // Find active subscriptions that need billing
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
        try {
          await this.createRecurringInvoice(
            subscription.id,
            subscription.userId,
            `Recurring payment for ${subscription.paymentPlan.name}`,
          );
          
          // Update next billing date
          subscription.nextBillingDate = this.calculateNextBillingDate(
            subscription.nextBillingDate,
            subscription.billingCycle,
          );
          
          await this.subscriptionRepository.save(subscription);
        } catch (error) {
          console.error(`Failed to create invoice for subscription ${subscription.id}:`, error);
          // Increment failed payment count
          subscription.failedPaymentCount++;
          await this.subscriptionRepository.save(subscription);
        }
      }
    }
  }

  async generateBulkInvoices(
    userId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<Invoice[]> {
    const query = this.subscriptionRepository.createQueryBuilder('subscription')
      .where('subscription.status = :status', { status: SubscriptionStatus.ACTIVE })
      .andWhere('subscription.nextBillingDate <= :today', { today: new Date() });

    if (userId) {
      query.andWhere('subscription.userId = :userId', { userId });
    }

    if (startDate && endDate) {
      query.andWhere('subscription.nextBillingDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const subscriptions = await query.getMany();
    const invoices: Invoice[] = [];

    for (const subscription of subscriptions) {
      try {
        const invoice = await this.createRecurringInvoice(
          subscription.id,
          subscription.userId,
        );
        invoices.push(invoice);
      } catch (error) {
        console.error(`Failed to create invoice for subscription ${subscription.id}:`, error);
      }
    }

    return invoices;
  }

  async getOverdueInvoices(daysOverdue: number = 30): Promise<Invoice[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOverdue);

    return this.invoiceRepository
      .createQueryBuilder('invoice')
      .where('invoice.dueDate < :cutoffDate', { cutoffDate })
      .andWhere('invoice.status IN (:...statuses)', {
        statuses: [InvoiceStatus.ISSUED, InvoiceStatus.SENT, InvoiceStatus.VIEWED],
      })
      .orderBy('invoice.dueDate', 'ASC')
      .getMany();
  }

  async sendOverdueReminders(): Promise<void> {
    const overdueInvoices = await this.getOverdueInvoices(7); // 7 days overdue

    for (const invoice of overdueInvoices) {
      // TODO: Implement email sending logic
      console.log(`Sending overdue reminder for invoice ${invoice.invoiceNumber}`);
      
      // Update invoice status to indicate reminder sent
      invoice.metadata = {
        ...invoice.metadata,
        reminderSent: true,
        reminderSentAt: new Date(),
      };
      
      await this.invoiceRepository.save(invoice);
    }
  }

  async applyDiscount(
    invoiceId: string,
    discountAmount: number,
    reason: string,
  ): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOneBy({ id: invoiceId });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException('Only draft invoices can have discounts applied');
    }

    const newTotal = Math.max(0, invoice.total - discountAmount);
    
    invoice.discount = (invoice.discount || 0) + discountAmount;
    invoice.total = newTotal;
    invoice.metadata = {
      ...invoice.metadata,
      discounts: [
        ...(invoice.metadata?.discounts || []),
        {
          amount: discountAmount,
          reason,
          appliedAt: new Date(),
        },
      ],
    };

    return this.invoiceRepository.save(invoice);
  }

  async getInvoiceAnalytics(
    userId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any> {
    const query = this.invoiceRepository.createQueryBuilder('invoice');

    if (userId) {
      query.where('invoice.userId = :userId', { userId });
    }

    if (startDate && endDate) {
      query.andWhere('invoice.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const invoices = await query.getMany();
    
    const totalInvoiced = invoices.reduce((sum, inv) => sum + Number(inv.total), 0);
    const totalPaid = invoices
      .filter(inv => inv.status === InvoiceStatus.PAID)
      .reduce((sum, inv) => sum + Number(inv.total), 0);
    
    const statusCounts = invoices.reduce((counts, inv) => {
      counts[inv.status] = (counts[inv.status] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    const overdueCount = invoices.filter(
      inv => inv.status !== InvoiceStatus.PAID && inv.dueDate < new Date(),
    ).length;

    return {
      totalInvoices: invoices.length,
      totalInvoiced,
      totalPaid,
      totalOutstanding: totalInvoiced - totalPaid,
      statusCounts,
      overdueCount,
      averageInvoiceAmount: invoices.length > 0 ? totalInvoiced / invoices.length : 0,
    };
  }

  async cancelInvoice(invoiceId: string, reason: string): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOneBy({ id: invoiceId });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Cannot cancel a paid invoice');
    }

    invoice.status = InvoiceStatus.CANCELLED;
    invoice.metadata = {
      ...invoice.metadata,
      cancellationReason: reason,
      cancelledAt: new Date(),
    };

    return this.invoiceRepository.save(invoice);
  }

  async cloneInvoice(invoiceId: string): Promise<Invoice> {
    const originalInvoice = await this.invoiceRepository.findOneBy({ id: invoiceId });

    if (!originalInvoice) {
      throw new NotFoundException('Invoice not found');
    }

    const newInvoice = this.invoiceRepository.create({
      ...originalInvoice,
      id: undefined,
      invoiceNumber: this.generateInvoiceNumber(),
      status: InvoiceStatus.DRAFT,
      createdAt: new Date(),
      updatedAt: new Date(),
      paidAt: null,
      amountPaid: 0,
      metadata: {
        ...originalInvoice.metadata,
        clonedFrom: invoiceId,
        clonedAt: new Date(),
      },
    });

    return this.invoiceRepository.save(newInvoice);
  }

  private generateInvoiceNumber(): string {
    return `INV-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  private calculateNextBillingDate(
    from: Date,
    cycle: string,
  ): Date {
    const date = new Date(from);

    switch (cycle) {
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'quarterly':
        date.setMonth(date.getMonth() + 3);
        break;
      case 'semi_annual':
        date.setMonth(date.getMonth() + 6);
        break;
      case 'annual':
        date.setFullYear(date.getFullYear() + 1);
        break;
    }

    return date;
  }
}