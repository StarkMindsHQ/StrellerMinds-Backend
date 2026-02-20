import { Payment } from '../../../payment/entities/payment.entity';
import { PaymentStatus, PaymentMethod } from '../../../payment/enums';

export interface PaymentFactoryOptions {
  userId?: string;
  status?: PaymentStatus;
  method?: PaymentMethod;
  count?: number;
}

/**
 * Factory for generating payment seed data
 */
export class PaymentFactory {
  /**
   * Generate a single payment
   */
  static generate(options: PaymentFactoryOptions = {}): Partial<Payment> {
    const amount = parseFloat((Math.random() * 500 + 10).toFixed(2));

    return {
      userId: options.userId,
      amount,
      currency: 'USD',
      status: options.status || PaymentStatus.COMPLETED,
      paymentMethod: options.method || this.randomPaymentMethod(),
      transactionId: this.generateTransactionId(),
      gatewayReferenceId: this.generateGatewayRef(),
      description: `Payment for course enrollment`,
      completedAt: options.status === PaymentStatus.COMPLETED ? new Date() : null,
      metadata: {
        processingFee: parseFloat((amount * 0.029 + 0.3).toFixed(2)),
        netAmount: parseFloat((amount * 0.971 - 0.3).toFixed(2)),
      },
    };
  }

  /**
   * Generate multiple payments
   */
  static generateMany(count: number, options: PaymentFactoryOptions = {}): Partial<Payment>[] {
    const payments: Partial<Payment>[] = [];
    for (let i = 0; i < count; i++) {
      payments.push(this.generate(options));
    }
    return payments;
  }

  /**
   * Generate transaction ID
   */
  private static generateTransactionId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Generate gateway reference ID
   */
  private static generateGatewayRef(): string {
    return `gw_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Get random payment method
   */
  private static randomPaymentMethod(): PaymentMethod {
    const methods = [
      PaymentMethod.CREDIT_CARD,
      PaymentMethod.DEBIT_CARD,
      PaymentMethod.PAYPAL,
      PaymentMethod.CRYPTO,
    ];
    return methods[Math.floor(Math.random() * methods.length)];
  }
}
