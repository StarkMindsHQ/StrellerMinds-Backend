import { BaseFactory } from './base.factory';
import { Payment } from '../../../payment/entities/payment.entity';
import { PaymentStatus, PaymentMethod } from '../../../payment/enums';
import { User } from '../../../auth/entities/user.entity';
import { Course } from '../../../course/entities/course.entity';
import { DataSource } from 'typeorm';

export interface PaymentFactoryOptions {
  user?: User;
  course?: Course;
  status?: PaymentStatus;
  method?: PaymentMethod;
  count?: number;
}

/**
 * Factory for generating payment test data
 */
export class PaymentFactory extends BaseFactory<Payment> {
  constructor(dataSource: DataSource) {
    super(dataSource);
  }

  protected getRepository() {
    return this.dataSource.getRepository(Payment);
  }

  async create(overrides: PaymentFactoryOptions = {}): Promise<Payment> {
    const paymentData = this.generate(overrides);
    return await this.save(paymentData);
  }

  generate(overrides: PaymentFactoryOptions = {}): Payment {
    const amount = this.randomNumber(10, 500) + Math.random();
    const status = overrides.status || this.randomPick(Object.values(PaymentStatus));
    const method = overrides.method || this.randomPick(Object.values(PaymentMethod));

    return {
      id: this.randomUUID(),
      user: overrides.user || null,
      course: overrides.course || null,
      amount,
      currency: 'USD',
      status,
      paymentMethod: method,
      transactionId: this.generateTransactionId(),
      gatewayReferenceId: this.generateGatewayRef(),
      description: `Payment for course enrollment`,
      completedAt: status === PaymentStatus.COMPLETED ? this.randomDate() : null,
      metadata: {
        processingFee: parseFloat((amount * 0.029 + 0.3).toFixed(2)),
        netAmount: parseFloat((amount * 0.971 - 0.3).toFixed(2)),
      },
      createdAt: this.randomDate(),
      updatedAt: new Date(),
    } as Payment;
  }

  /**
   * Generate transaction ID
   */
  private generateTransactionId(): string {
    return `txn_${this.randomString(32)}`;
  }

  /**
   * Generate gateway reference
   */
  private generateGatewayRef(): string {
    return `gw_${this.randomString(24)}`;
  }

  /**
   * Create completed payments
   */
  async createCompleted(count: number, overrides: PaymentFactoryOptions = {}): Promise<Payment[]> {
    return await this.createMany(count, {
      ...overrides,
      status: PaymentStatus.COMPLETED,
    });
  }

  /**
   * Create pending payments
   */
  async createPending(count: number, overrides: PaymentFactoryOptions = {}): Promise<Payment[]> {
    return await this.createMany(count, {
      ...overrides,
      status: PaymentStatus.PENDING,
    });
  }

  /**
   * Create failed payments
   */
  async createFailed(count: number, overrides: PaymentFactoryOptions = {}): Promise<Payment[]> {
    return await this.createMany(count, {
      ...overrides,
      status: PaymentStatus.FAILED,
    });
  }

  /**
   * Create refunded payments
   */
  async createRefunded(count: number, overrides: PaymentFactoryOptions = {}): Promise<Payment[]> {
    return await this.createMany(count, {
      ...overrides,
      status: PaymentStatus.REFUNDED,
    });
  }

  /**
   * Create payments for specific user and course
   */
  async createForUserAndCourse(user: User, course: Course, status?: PaymentStatus): Promise<Payment> {
    return await this.create({
      user,
      course,
      status,
    });
  }
}
