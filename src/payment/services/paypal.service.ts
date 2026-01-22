import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { Payment, Refund } from '../entities';
import { PaymentStatus, PaymentMethod } from '../enums';
import { ProcessPaymentDto } from '../dto';

@Injectable()
export class PayPalService {
  private baseUrl = 'https://api.paypal.com/v1';

  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
  ) {
    if (process.env.PAYPAL_MODE === 'sandbox') {
      this.baseUrl = 'https://api.sandbox.paypal.com/v1';
    }
  }

  async getAccessToken(): Promise<string> {
    try {
      const auth = Buffer.from(
        `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`,
      ).toString('base64');

      const response = await axios.post(
        `${this.baseUrl}/oauth2/token`,
        'grant_type=client_credentials',
        {
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      return response.data.access_token;
    } catch (error) {
      throw new BadRequestException(
        `Failed to get PayPal access token: ${error.message}`,
      );
    }
  }

  async createOrder(userId: string, dto: ProcessPaymentDto): Promise<any> {
    try {
      const token = await this.getAccessToken();

      const response = await axios.post(
        `${this.baseUrl}/checkout/orders`,
        {
          intent: 'CAPTURE',
          purchase_units: [
            {
              amount: {
                currency_code: dto.currency,
                value: dto.amount.toString(),
              },
            },
          ],
          metadata: {
            userId,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data;
    } catch (error) {
      throw new BadRequestException(
        `Failed to create PayPal order: ${error.message}`,
      );
    }
  }

  async captureOrder(orderId: string, userId: string, amount: number): Promise<Payment> {
    try {
      const token = await this.getAccessToken();

      const response = await axios.post(
        `${this.baseUrl}/checkout/orders/${orderId}/capture`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (response.data.status !== 'COMPLETED') {
        throw new BadRequestException('PayPal payment not completed');
      }

      // Create payment record
      const payment = this.paymentRepository.create({
        userId,
        amount,
        currency: response.data.purchase_units[0].amount.currency_code,
        paymentMethod: PaymentMethod.PAYPAL,
        status: PaymentStatus.COMPLETED,
        transactionId: orderId,
        gatewayReferenceId:
          response.data.purchase_units[0].payments.captures[0].id,
        completedAt: new Date(),
      });

      return this.paymentRepository.save(payment);
    } catch (error) {
      throw new BadRequestException(
        `Failed to capture PayPal order: ${error.message}`,
      );
    }
  }

  async createSubscription(userId: string, planId: string): Promise<any> {
    try {
      const token = await this.getAccessToken();

      const response = await axios.post(
        `${this.baseUrl}/billing/subscriptions`,
        {
          plan_id: planId,
          subscriber: {
            name: {
              given_name: userId,
            },
          },
          metadata: {
            userId,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data;
    } catch (error) {
      throw new BadRequestException(
        `Failed to create PayPal subscription: ${error.message}`,
      );
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      const token = await this.getAccessToken();

      await axios.post(
        `${this.baseUrl}/billing/subscriptions/${subscriptionId}/cancel`,
        { reason: 'Cancelled by user' },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );
    } catch (error) {
      throw new BadRequestException(
        `Failed to cancel PayPal subscription: ${error.message}`,
      );
    }
  }

  async refund(transactionId: string, amount?: number): Promise<any> {
    try {
      const token = await this.getAccessToken();

      const response = await axios.post(
        `${this.baseUrl}/payments/capture/${transactionId}/refund`,
        {
          amount: amount ? { currency_code: 'USD', value: amount.toString() } : undefined,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data;
    } catch (error) {
      throw new BadRequestException(
        `Failed to refund PayPal payment: ${error.message}`,
      );
    }
  }
}
