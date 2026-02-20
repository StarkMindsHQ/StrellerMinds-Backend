import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import {
  Payment,
  Subscription,
  PaymentPlan,
  Invoice,
  Refund,
  Dispute,
  FinancialReport,
} from '../entities';
import { PaymentStatus, SubscriptionStatus, BillingCycle, PaymentMethod } from '../enums';
import { StripeService } from './stripe.service';
import { PayPalService } from './paypal.service';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    @InjectRepository(Refund)
    private refundRepository: Repository<Refund>,
    private stripeService: StripeService,
    private paypalService: PayPalService,
  ) {}

  async initializePayment(userId: string, amount: number, method: string) {
    if (method === 'stripe') {
      return this.stripeService.createPaymentIntent(userId, {
        amount,
        currency: 'USD',
        paymentMethod: PaymentMethod.STRIPE,
      });
    } else if (method === 'paypal') {
      const order = await this.paypalService.createOrder(userId, {
        amount,
        currency: 'USD',
        paymentMethod: PaymentMethod.PAYPAL,
      });
      return order.id;
    }
  }

  async getPaymentHistory(userId: string): Promise<Payment[]> {
    return this.paymentRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getPayment(paymentId: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOneBy({ id: paymentId });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    return payment;
  }

  async updatePaymentStatus(paymentId: string, status: PaymentStatus): Promise<Payment> {
    const payment = await this.getPayment(paymentId);
    payment.status = status;

    if (status === PaymentStatus.COMPLETED) {
      payment.completedAt = new Date();
    }

    return this.paymentRepository.save(payment);
  }

  async createRefundRequest(paymentId: string, amount?: number, reason?: string): Promise<Refund> {
    const payment = await this.getPayment(paymentId);

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException('Only completed payments can be refunded');
    }

    const refund = this.refundRepository.create({
      paymentId,
      userId: payment.userId,
      amount: amount || payment.amount,
      currency: payment.currency,
      reason,
    });

    return this.refundRepository.save(refund);
  }

  async processRefund(refundId: string): Promise<Refund> {
    const refund = await this.refundRepository.findOneBy({ id: refundId });
    if (!refund) {
      throw new NotFoundException('Refund not found');
    }

    const payment = await this.getPayment(refund.paymentId);

    if (payment.paymentMethod === PaymentMethod.STRIPE) {
      const stripeRefund = await this.stripeService.refundPayment(
        payment.gatewayReferenceId,
        refund.amount,
      );
      refund.gatewayRefundId = stripeRefund.id;
    } else if (payment.paymentMethod === PaymentMethod.PAYPAL) {
      const paypalRefund = await this.paypalService.refund(
        payment.gatewayReferenceId,
        refund.amount,
      );
      refund.gatewayRefundId = paypalRefund.id;
    }

    refund.processedAt = new Date();
    return this.refundRepository.save(refund);
  }
}
