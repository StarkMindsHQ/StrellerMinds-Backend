import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
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
import axios from 'axios';

@Injectable()
export class SquareService {
  private readonly baseUrl: string;
  private readonly accessToken: string;

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
    this.accessToken = process.env.SQUARE_ACCESS_TOKEN || '';
    this.baseUrl = process.env.SQUARE_ENVIRONMENT === 'production' 
      ? 'https://connect.squareup.com' 
      : 'https://connect.squareupsandbox.com';
  }

  async createPayment(
    userId: string,
    dto: ProcessPaymentDto,
  ): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/v2/payments`,
        {
          source_id: dto.paymentMethodId,
          amount_money: {
            amount: Math.round(dto.amount * 100),
            currency: dto.currency.toUpperCase(),
          },
          idempotency_key: dto.idempotencyKey || `payment-${userId}-${Date.now()}`,
          reference_id: `user-${userId}`,

        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data.payment;
    } catch (error) {
      throw new BadRequestException(`Failed to create Square payment: ${error.message}`);
    }
  }

  async confirmPayment(
    userId: string,
    paymentId: string,
    dto: CreatePaymentDto,
  ): Promise<Payment> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/v2/payments/${paymentId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
        },
      );

      const squarePayment = response.data.payment;

      if (squarePayment.status !== 'COMPLETED') {
        throw new BadRequestException('Payment not completed');
      }

      // Create payment record
      const payment = this.paymentRepository.create({
        userId,
        amount: dto.amount,
        currency: dto.currency || 'USD',
        paymentMethod: PaymentMethod.SQUARE,
        status: PaymentStatus.COMPLETED,
        transactionId: paymentId,
        gatewayReferenceId: squarePayment.id,

        metadata: {
          ...dto.metadata,
          squarePaymentId: squarePayment.id,
          receiptUrl: squarePayment.receipt_url,
        },
        completedAt: new Date(),
      });

      return this.paymentRepository.save(payment);
    } catch (error) {
      throw new BadRequestException(`Failed to confirm Square payment: ${error.message}`);
    }
  }

  async createSubscription(
    userId: string,
    planId: string,
    customerId: string,
  ): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/v2/subscriptions`,
        {
          location_id: process.env.SQUARE_LOCATION_ID,
          plan_id: planId,
          customer_id: customerId,
          idempotency_key: `subscription-${userId}-${Date.now()}`,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data.subscription;
    } catch (error) {
      throw new BadRequestException(`Failed to create Square subscription: ${error.message}`);
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      await axios.post(
        `${this.baseUrl}/v2/subscriptions/${subscriptionId}/cancel`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
    } catch (error) {
      throw new BadRequestException(`Failed to cancel Square subscription: ${error.message}`);
    }
  }

  async refundPayment(
    paymentId: string,
    amount?: number,
  ): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/v2/refunds`,
        {
          payment_id: paymentId,
          amount_money: amount
            ? {
                amount: Math.round(amount * 100),
                currency: 'USD',
              }
            : undefined,
          idempotency_key: `refund-${paymentId}-${Date.now()}`,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data.refund;
    } catch (error) {
      throw new BadRequestException(`Failed to create Square refund: ${error.message}`);
    }
  }

  async createCustomer(
    userId: string,
    email: string,
    firstName?: string,
    lastName?: string,
  ): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/v2/customers`,
        {
          email_address: email,
          given_name: firstName,
          family_name: lastName,
          reference_id: `user-${userId}`,
          note: `User ID: ${userId}`,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data.customer;
    } catch (error) {
      throw new BadRequestException(`Failed to create Square customer: ${error.message}`);
    }
  }

  async createPaymentMethod(
    customerId: string,
    sourceId: string,
  ): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/v2/customers/${customerId}/cards`,
        {
          card_nonce: sourceId,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data.card;
    } catch (error) {
      throw new BadRequestException(`Failed to create Square payment method: ${error.message}`);
    }
  }
}