import { Repository } from 'typeorm';
import { Payment } from '../../payment/entities/payment.entity';
import { BaseFactory } from './base.factory';

export interface PaymentFactoryOptions {
  userId?: string;
  amount?: number;
  status?: string;
  method?: string;
  courseId?: string;
  userIds?: string[];
}

/**
 * Enhanced payment factory for test data
 */
export class PaymentFactory extends BaseFactory<Payment> {
  private static readonly STATUSES = ['pending', 'completed', 'failed', 'refunded'];
  private static readonly METHODS = ['credit_card', 'paypal', 'stripe', 'bank_transfer'];

  protected getRepository(): Repository<Payment> {
    return this.dataSource.getRepository(Payment);
  }

  /**
   * Generate payment data without persisting
   */
  generate(overrides: PaymentFactoryOptions = {}): Payment {
    return {
      id: this.randomUUID(),
      userId: overrides.userId || this.randomUUID(),
      amount: overrides.amount ?? this.randomNumber(10, 500),
      status: overrides.status || this.randomPick(PaymentFactory.STATUSES),
      method: overrides.method || this.randomPick(PaymentFactory.METHODS),
      courseId: overrides.courseId,
      transactionId: this.randomUUID(),
      createdAt: this.randomDate(),
      updatedAt: new Date(),
      deletedAt: null,
    } as Payment;
  }

  /**
   * Create and persist a payment
   */
  async create(overrides: PaymentFactoryOptions = {}): Promise<Payment> {
    const paymentData = this.generate(overrides);
    return this.save(paymentData);
  }

  /**
   * Create multiple payments
   */
  async createMany(count: number, overrides: PaymentFactoryOptions = {}): Promise<Payment[]> {
    const payments: Payment[] = [];
    
    for (let i = 0; i < count; i++) {
      const userId = overrides.userIds 
        ? this.randomPick(overrides.userIds)
        : overrides.userId;
        
      payments.push(await this.create({
        ...overrides,
        userId,
      }));
    }
    
    return payments;
  }

  /**
   * Create completed payment
   */
  async createCompleted(overrides: PaymentFactoryOptions = {}): Promise<Payment> {
    return this.create({
      ...overrides,
      status: 'completed',
    });
  }

  /**
   * Create pending payment
   */
  async createPending(overrides: PaymentFactoryOptions = {}): Promise<Payment> {
    return this.create({
      ...overrides,
      status: 'pending',
    });
  }

  /**
   * Create failed payment
   */
  async createFailed(overrides: PaymentFactoryOptions = {}): Promise<Payment> {
    return this.create({
      ...overrides,
      status: 'failed',
    });
  }
}
