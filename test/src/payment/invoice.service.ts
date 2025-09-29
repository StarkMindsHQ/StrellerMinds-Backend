import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvoiceEntity, InvoiceStatus, InvoiceType } from './entities/invoice.entity';
import { PaymentEntity } from './entities/payment.entity';
import { StripeService } from './stripe.service';

export interface CreateInvoiceDto {
  paymentId: string;
  customerEmail: string;
  customerName: string;
  billingAddress?: string;
  shippingAddress?: string;
  description?: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitAmount: number;
    totalAmount: number;
  }>;
  notes?: string;
  terms?: string;
  footer?: string;
  dueDate?: Date;
}

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(
    @InjectRepository(InvoiceEntity)
    private invoiceRepository: Repository<InvoiceEntity>,
    @InjectRepository(PaymentEntity)
    private paymentRepository: Repository<PaymentEntity>,
    private stripeService: StripeService,
  ) {}

  /**
   * Generate invoice for a payment
   */
  async generateInvoiceForPayment(paymentId: string): Promise<InvoiceEntity> {
    try {
      const payment = await this.paymentRepository.findOne({
        where: { id: paymentId },
        relations: ['user'],
      });

      if (!payment) {
        throw new NotFoundException(`Payment not found: ${paymentId}`);
      }

      // Create invoice in Stripe
      const stripeInvoice = await this.stripeService.createInvoice({
        customerId: payment.user?.stripeCustomerId || 'temp_customer',
        description: payment.description || 'Payment invoice',
        lineItems: [
          {
            price: this.createPriceId(payment.amount, payment.currency),
            quantity: 1,
            description: payment.description || 'Payment',
          },
        ],
        metadata: {
          paymentId: payment.id,
          userId: payment.userId,
        },
      });

      // Create invoice record in database
      const invoice = this.invoiceRepository.create({
        paymentId: payment.id,
        stripeInvoiceId: stripeInvoice.id,
        invoiceNumber: this.generateInvoiceNumber(),
        status: this.mapStripeInvoiceStatus(stripeInvoice.status),
        type: InvoiceType.INVOICE,
        amount: payment.amount,
        currency: payment.currency,
        taxAmount: payment.taxAmount || 0,
        discountAmount: payment.discountAmount || 0,
        subtotal: payment.amount - (payment.taxAmount || 0) + (payment.discountAmount || 0),
        total: payment.amount,
        description: payment.description,
        lineItems: [
          {
            description: payment.description || 'Payment',
            quantity: 1,
            unitAmount: payment.amount,
            totalAmount: payment.amount,
          },
        ],
        customerEmail: payment.customerEmail || payment.user?.email,
        customerName: payment.customerName || payment.user?.name,
        billingAddress: payment.billingAddress,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        pdfUrl: stripeInvoice.invoice_pdf,
        hostedInvoiceUrl: stripeInvoice.hosted_invoice_url,
      });

      const savedInvoice = await this.invoiceRepository.save(invoice);

      this.logger.log(`Generated invoice for payment: ${paymentId} - Invoice: ${savedInvoice.id}`);
      return savedInvoice;
    } catch (error) {
      this.logger.error('Failed to generate invoice for payment', error);
      throw error;
    }
  }

  /**
   * Create a custom invoice
   */
  async createInvoice(data: CreateInvoiceDto): Promise<InvoiceEntity> {
    try {
      const payment = await this.paymentRepository.findOne({
        where: { id: data.paymentId },
      });

      if (!payment) {
        throw new NotFoundException(`Payment not found: ${data.paymentId}`);
      }

      // Create invoice in Stripe
      const stripeInvoice = await this.stripeService.createInvoice({
        customerId: payment.user?.stripeCustomerId || 'temp_customer',
        description: data.description,
        lineItems: data.lineItems.map(item => ({
          price: this.createPriceId(item.unitAmount, payment.currency),
          quantity: item.quantity,
          description: item.description,
        })),
        metadata: {
          paymentId: payment.id,
          userId: payment.userId,
        },
        dueDate: data.dueDate,
      });

      // Calculate totals
      const subtotal = data.lineItems.reduce((sum, item) => sum + item.totalAmount, 0);
      const total = subtotal + (payment.taxAmount || 0) - (payment.discountAmount || 0);

      // Create invoice record in database
      const invoice = this.invoiceRepository.create({
        paymentId: payment.id,
        stripeInvoiceId: stripeInvoice.id,
        invoiceNumber: this.generateInvoiceNumber(),
        status: this.mapStripeInvoiceStatus(stripeInvoice.status),
        type: InvoiceType.INVOICE,
        amount: total,
        currency: payment.currency,
        taxAmount: payment.taxAmount || 0,
        discountAmount: payment.discountAmount || 0,
        subtotal: subtotal,
        total: total,
        description: data.description,
        lineItems: data.lineItems,
        customerEmail: data.customerEmail,
        customerName: data.customerName,
        billingAddress: data.billingAddress,
        shippingAddress: data.shippingAddress,
        dueDate: data.dueDate,
        notes: data.notes,
        terms: data.terms,
        footer: data.footer,
        pdfUrl: stripeInvoice.invoice_pdf,
        hostedInvoiceUrl: stripeInvoice.hosted_invoice_url,
      });

      const savedInvoice = await this.invoiceRepository.save(invoice);

      this.logger.log(`Created invoice: ${savedInvoice.id}`);
      return savedInvoice;
    } catch (error) {
      this.logger.error('Failed to create invoice', error);
      throw error;
    }
  }

  /**
   * Get invoice by ID
   */
  async getInvoiceById(invoiceId: string): Promise<InvoiceEntity> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId },
      relations: ['payment', 'payment.user'],
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice not found: ${invoiceId}`);
    }

    return invoice;
  }

  /**
   * Get invoices by payment ID
   */
  async getInvoicesByPaymentId(paymentId: string): Promise<InvoiceEntity[]> {
    return this.invoiceRepository.find({
      where: { paymentId },
      relations: ['payment'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get invoices by customer email
   */
  async getInvoicesByCustomerEmail(customerEmail: string): Promise<InvoiceEntity[]> {
    return this.invoiceRepository.find({
      where: { customerEmail },
      relations: ['payment'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Pay an invoice
   */
  async payInvoice(invoiceId: string, paymentMethodId?: string): Promise<InvoiceEntity> {
    try {
      const invoice = await this.getInvoiceById(invoiceId);

      if (invoice.status === InvoiceStatus.PAID) {
        throw new Error('Invoice is already paid');
      }

      // Pay invoice in Stripe
      const stripeInvoice = await this.stripeService.payInvoice(
        invoice.stripeInvoiceId,
        paymentMethodId,
      );

      // Update invoice status
      invoice.status = InvoiceStatus.PAID;
      invoice.paidAt = new Date();

      const updatedInvoice = await this.invoiceRepository.save(invoice);

      this.logger.log(`Paid invoice: ${invoiceId}`);
      return updatedInvoice;
    } catch (error) {
      this.logger.error('Failed to pay invoice', error);
      throw error;
    }
  }

  /**
   * Void an invoice
   */
  async voidInvoice(invoiceId: string, reason?: string): Promise<InvoiceEntity> {
    try {
      const invoice = await this.getInvoiceById(invoiceId);

      if (invoice.status === InvoiceStatus.PAID) {
        throw new Error('Cannot void a paid invoice');
      }

      // Update invoice status
      invoice.status = InvoiceStatus.VOID;
      invoice.voidedAt = new Date();
      invoice.voidReason = reason;

      const updatedInvoice = await this.invoiceRepository.save(invoice);

      this.logger.log(`Voided invoice: ${invoiceId}`);
      return updatedInvoice;
    } catch (error) {
      this.logger.error('Failed to void invoice', error);
      throw error;
    }
  }

  /**
   * Update invoice from webhook
   */
  async updateInvoiceFromWebhook(stripeInvoiceId: string, status: InvoiceStatus): Promise<InvoiceEntity> {
    const invoice = await this.invoiceRepository.findOne({
      where: { stripeInvoiceId },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice not found for Stripe invoice: ${stripeInvoiceId}`);
    }

    invoice.status = status;

    if (status === InvoiceStatus.PAID) {
      invoice.paidAt = new Date();
    }

    const updatedInvoice = await this.invoiceRepository.save(invoice);

    this.logger.log(`Updated invoice from webhook: ${invoice.id} - Status: ${status}`);
    return updatedInvoice;
  }

  /**
   * Get invoice statistics
   */
  async getInvoiceStats(): Promise<any> {
    const stats = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .select([
        'invoice.status',
        'invoice.type',
        'COUNT(*) as count',
        'SUM(invoice.total) as total_amount',
      ])
      .groupBy('invoice.status, invoice.type')
      .getRawMany();

    return stats;
  }

  /**
   * Get overdue invoices
   */
  async getOverdueInvoices(): Promise<InvoiceEntity[]> {
    const now = new Date();

    return this.invoiceRepository
      .createQueryBuilder('invoice')
      .where('invoice.dueDate <= :now', { now })
      .andWhere('invoice.status = :status', { status: InvoiceStatus.OPEN })
      .getMany();
  }

  /**
   * Generate invoice number
   */
  private generateInvoiceNumber(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `INV-${timestamp}-${random}`;
  }

  /**
   * Create a temporary price ID for Stripe
   */
  private createPriceId(amount: number, currency: string): string {
    // In a real implementation, you would create a proper price in Stripe
    // For now, we'll use a placeholder
    return `price_${amount}_${currency}`;
  }

  /**
   * Map Stripe invoice status to our enum
   */
  private mapStripeInvoiceStatus(stripeStatus: string): InvoiceStatus {
    switch (stripeStatus) {
      case 'draft':
        return InvoiceStatus.DRAFT;
      case 'open':
        return InvoiceStatus.OPEN;
      case 'paid':
        return InvoiceStatus.PAID;
      case 'void':
        return InvoiceStatus.VOID;
      case 'uncollectible':
        return InvoiceStatus.UNCOLLECTIBLE;
      default:
        return InvoiceStatus.DRAFT;
    }
  }

  /**
   * Generate PDF for invoice
   */
  async generateInvoicePDF(invoiceId: string): Promise<string> {
    try {
      const invoice = await this.getInvoiceById(invoiceId);

      // In a real implementation, you would generate a PDF using a library like PDFKit
      // For now, we'll return the Stripe PDF URL if available
      if (invoice.pdfUrl) {
        return invoice.pdfUrl;
      }

      // Generate a placeholder PDF URL
      return `https://api.strellerminds.com/invoices/${invoiceId}/pdf`;
    } catch (error) {
      this.logger.error('Failed to generate invoice PDF', error);
      throw error;
    }
  }

  /**
   * Send invoice to customer
   */
  async sendInvoiceToCustomer(invoiceId: string): Promise<void> {
    try {
      const invoice = await this.getInvoiceById(invoiceId);

      // In a real implementation, you would send an email with the invoice
      // For now, we'll just log the action
      this.logger.log(`Sending invoice ${invoiceId} to ${invoice.customerEmail}`);

      // You could integrate with your email service here
      // await this.emailService.sendInvoiceEmail(invoice);
    } catch (error) {
      this.logger.error('Failed to send invoice to customer', error);
      throw error;
    }
  }
} 