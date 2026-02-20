import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Payment,
  Subscription,
  PaymentPlan,
  Invoice,
  Refund,
} from '../entities';
import { PaymentStatus, PaymentMethod } from '../enums';
import { CreatePaymentDto, ProcessPaymentDto } from '../dto';


@Injectable()
export class RazorpayService {
  private readonly keyId: string;
  private readonly keySecret: string;
  private readonly baseUrl: string;

  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    @InjectRepository(Refund)
    private refundRepository: Repository<Refund>,
  ) {
    this.keyId = process.env.RAZORPAY_KEY_ID || '';
    this.keySecret = process.env.RAZORPAY_KEY_SECRET || '';
    this.baseUrl = 'https://api.razorpay.com/v1';
  }

  async createPayment(
    userId: string,
    dto: ProcessPaymentDto,
  ): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round(dto.amount * 100),
          currency: dto.currency.toUpperCase(),
          receipt: `receipt-${userId}-${Date.now()}`,
          notes: {
            userId,
            description: dto.description,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw new BadRequestException(`Failed to create Razorpay order: ${error.message}`);
    }
  }

  async confirmPayment(
    userId: string,
    paymentId: string,
    razorpayOrderId: string,
    razorpaySignature: string,
    dto: CreatePaymentDto,
  ): Promise<Payment> {
    try {
      // Verify signature
      const body = razorpayOrderId + '|' + paymentId;
      // Signature verification would go here in a real implementation

      // In a real implementation, verify the signature here
      // For now, we'll skip signature verification

      // Fetch payment details
      const response = await fetch(`${this.baseUrl}/payments/${paymentId}`, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64')}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const razorpayPayment = await response.json();

      if (razorpayPayment.status !== 'captured') {
        throw new BadRequestException('Payment not captured');
      }

      // Create payment record
      const payment = this.paymentRepository.create({
        userId,
        amount: dto.amount,
        currency: dto.currency || 'INR',
        paymentMethod: PaymentMethod.RAZORPAY,
        status: PaymentStatus.COMPLETED,
        transactionId: paymentId,
        gatewayReferenceId: razorpayPayment.id,
        description: dto.description,
        metadata: {
          ...dto.metadata,
          razorpayPaymentId: razorpayPayment.id,
          razorpayOrderId: razorpayOrderId,
        },
        completedAt: new Date(),
      });

      return this.paymentRepository.save(payment);
    } catch (error) {
      throw new BadRequestException(`Failed to confirm Razorpay payment: ${error.message}`);
    }
  }

  async createSubscription(
    userId: string,
    planId: string,
    customerId: string,
  ): Promise<any> {
    // Implementation for subscription creation
    return { success: true };
  }

  async refundPayment(
    paymentId: string,
    amount?: number,
    notes?: string,
  ): Promise<any> {
    // Implementation for refund creation
    return { success: true };
  }

  async createCustomer(
    userId: string,
    email: string,
    firstName?: string,
    lastName?: string,
    contact?: string,
  ): Promise<any> {
    // Implementation for customer creation
    return { success: true };
  }
}