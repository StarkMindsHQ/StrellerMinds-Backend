import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice, Payment } from '../entities';
import { InvoiceStatus } from '../enums';
import { CreateInvoiceDto, UpdateInvoiceDto, SendInvoiceDto } from '../dto';

@Injectable()
export class InvoiceService {
  constructor(
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
  ) {}

  async createInvoice(userId: string, dto: CreateInvoiceDto): Promise<Invoice> {
    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const total = dto.subtotal - (dto.discount || 0) + (dto.tax || 0);

    const invoice = this.invoiceRepository.create({
      invoiceNumber,
      userId,
      subscriptionId: dto.subscriptionId,
      subtotal: dto.subtotal,
      tax: dto.tax || 0,
      discount: dto.discount || 0,
      total,
      currency: dto.currency || 'USD',
      dueDate: dto.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      notes: dto.notes,
      lineItems: dto.lineItems,
      metadata: dto.metadata,
    });

    return this.invoiceRepository.save(invoice);
  }

  async getInvoice(invoiceId: string): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOneBy({ id: invoiceId });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  async getUserInvoices(userId: string): Promise<Invoice[]> {
    return this.invoiceRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async updateInvoice(invoiceId: string, dto: UpdateInvoiceDto): Promise<Invoice> {
    const invoice = await this.getInvoice(invoiceId);

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException('Only draft invoices can be updated');
    }

    const updates = {
      tax: dto.tax ?? invoice.tax,
      discount: dto.discount ?? invoice.discount,
      dueDate: dto.dueDate || invoice.dueDate,
      notes: dto.notes || invoice.notes,
    };

    const total = invoice.subtotal - (updates.discount || 0) + (updates.tax || 0);

    Object.assign(invoice, updates, { total });

    return this.invoiceRepository.save(invoice);
  }

  async sendInvoice(invoiceId: string, dto: SendInvoiceDto): Promise<Invoice> {
    const invoice = await this.getInvoice(invoiceId);

    // TODO: Implement email sending logic
    // await this.emailService.sendInvoice(dto.email, invoice, dto.subject, dto.message);

    invoice.status = InvoiceStatus.SENT;
    return this.invoiceRepository.save(invoice);
  }

  async markAsPaid(invoiceId: string, amountPaid?: number): Promise<Invoice> {
    const invoice = await this.getInvoice(invoiceId);

    const paid = amountPaid || invoice.total;

    invoice.amountPaid = paid;

    if (paid >= invoice.total) {
      invoice.status = InvoiceStatus.PAID;
      invoice.paidAt = new Date();
    } else {
      invoice.status = InvoiceStatus.PARTIALLY_PAID;
    }

    return this.invoiceRepository.save(invoice);
  }

  async getOverdueInvoices(): Promise<Invoice[]> {
    const today = new Date();

    return this.invoiceRepository
      .createQueryBuilder('invoice')
      .where('invoice.dueDate < :today', { today })
      .andWhere('invoice.status != :status', {
        status: InvoiceStatus.PAID,
      })
      .getMany();
  }
}
