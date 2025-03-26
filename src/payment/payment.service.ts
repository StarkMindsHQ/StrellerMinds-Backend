import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentMethod, PaymentStatus, PaymentType } from './entities/payment.entity';
import { Subscription, SubscriptionStatus } from './entities/subscription.entity';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { StellarService } from './services/stellar.service';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/entities/user.entity';
import * as PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,
    @InjectRepository(Subscription)
    private subscriptionsRepository: Repository<Subscription>,
    private stellarService: StellarService,
    private configService: ConfigService,
  ) {}

  async processPayment(user: User, dto: ProcessPaymentDto): Promise<Payment> {
    const payment = this.paymentsRepository.create({
      amount: dto.amount,
      paymentMethod: dto.paymentMethod,
      type: dto.type,
      user,
      status: PaymentStatus.PENDING,
    });

    if (dto.courseId) {
      payment.course = { id: dto.courseId } as any;
    }

    try {
      // Handle different payment methods
      switch (dto.paymentMethod) {
        case PaymentMethod.XLM:
          if (!dto.stellarPublicKey) {
            throw new BadRequestException('Stellar public key is required for XLM payments');
          }
          payment.transactionId = await this.stellarService.processPayment(
            dto.stellarPublicKey,
            dto.amount
          );
          break;

        case PaymentMethod.CREDIT_CARD:
        case PaymentMethod.PAYPAL:
          if (!dto.paymentToken) {
            throw new BadRequestException('Payment token is required for traditional payments');
          }
          // Process traditional payment (implement your payment gateway integration here)
          payment.transactionId = 'mock_transaction_' + Date.now(); // Replace with actual implementation
          break;
      }

      payment.status = PaymentStatus.COMPLETED;

      // Create subscription if payment type is subscription
      if (dto.type === PaymentType.SUBSCRIPTION && dto.planName && dto.billingCycle) {
        const subscription = await this.createSubscription(user, dto);
        payment.subscription = subscription;
      }

      // Generate receipt
      payment.receiptUrl = await this.generateReceipt(payment);

      return this.paymentsRepository.save(payment);
    } catch (error) {
      payment.status = PaymentStatus.FAILED;
      payment.metadata = { error: error.message };
      await this.paymentsRepository.save(payment);
      throw error;
    }
  }

  private async createSubscription(user: User, dto: ProcessPaymentDto): Promise<Subscription> {
    const nextBillingDate = new Date();
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1); // Default to monthly

    const subscription = this.subscriptionsRepository.create({
      user,
      planName: dto.planName,
      amount: dto.amount,
      billingCycle: dto.billingCycle,
      status: SubscriptionStatus.ACTIVE,
      nextBillingDate,
    });

    return this.subscriptionsRepository.save(subscription);
  }

  private async generateReceipt(payment: Payment): Promise<string> {
    const doc = new PDFDocument();
    const fileName = `receipt_${payment.id}.pdf`;
    const filePath = path.join('uploads', 'receipts', fileName);

    // Ensure directory exists
    if (!fs.existsSync(path.dirname(filePath))) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
    }

    // Create PDF
    doc.pipe(fs.createWriteStream(filePath));
    doc
      .fontSize(25)
      .text('Receipt', { align: 'center' })
      .moveDown()
      .fontSize(12)
      .text(`Payment ID: ${payment.id}`)
      .text(`Amount: ${payment.amount}`)
      .text(`Date: ${payment.createdAt}`)
      .text(`Status: ${payment.status}`)
      .text(`Transaction ID: ${payment.transactionId}`);

    doc.end();

    // Return URL path to receipt
    return `/receipts/${fileName}`;
  }

  async verifyPayment(id: string): Promise<boolean> {
    const payment = await this.findOne(id);
    
    if (payment.paymentMethod === PaymentMethod.XLM) {
      return this.stellarService.verifyPayment(payment.transactionId);
    }
    
    // Implement verification for other payment methods
    return payment.status === PaymentStatus.COMPLETED;
  }

  async processRefund(id: string, reason: string): Promise<Payment> {
    const payment = await this.findOne(id);
    
    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException('Only completed payments can be refunded');
    }

    // Implement refund logic based on payment method
    // For this example, we'll just mark it as refunded
    payment.status = PaymentStatus.REFUNDED;
    payment.refundReason = reason;
    
    return this.paymentsRepository.save(payment);
  }

  async findAll(): Promise<Payment[]> {
    return this.paymentsRepository.find({
      relations: ['user', 'course', 'subscription'],
    });
  }

  async findOne(id: string): Promise<Payment> {
    const payment = await this.paymentsRepository.findOne({
      where: { id },
      relations: ['user', 'course', 'subscription'],
    });
    
    if (!payment) {
      throw new NotFoundException(`Payment with id ${id} not found`);
    }
    
    return payment;
  }

  async getUserPayments(userId: string): Promise<Payment[]> {
    return this.paymentsRepository.find({
      where: { user: { id: userId } },
      relations: ['course', 'subscription'],
    });
  }
}
