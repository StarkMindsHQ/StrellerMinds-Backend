import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { PaymentEntity } from './payment.entity';

export enum SubscriptionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  CANCELLED = 'cancelled',
  PAST_DUE = 'past_due',
  UNPAID = 'unpaid',
  TRIAL = 'trial',
}

export enum SubscriptionPlan {
  BASIC = 'basic',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise',
  STUDENT = 'student',
}

export enum BillingCycle {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
}

@Entity('subscriptions')
export class SubscriptionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  stripeSubscriptionId: string;

  @Column()
  stripeCustomerId: string;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.INACTIVE,
  })
  status: SubscriptionStatus;

  @Column({
    type: 'enum',
    enum: SubscriptionPlan,
  })
  plan: SubscriptionPlan;

  @Column({
    type: 'enum',
    enum: BillingCycle,
  })
  billingCycle: BillingCycle;

  @Column()
  amount: number; // Amount in cents

  @Column()
  currency: string;

  @Column()
  currentPeriodStart: Date;

  @Column()
  currentPeriodEnd: Date;

  @Column({ nullable: true })
  trialStart: Date;

  @Column({ nullable: true })
  trialEnd: Date;

  @Column({ nullable: true })
  cancelledAt: Date;

  @Column({ nullable: true })
  cancelAtPeriodEnd: boolean;

  @Column({ nullable: true })
  cancelReason: string;

  @Column({ type: 'jsonb', nullable: true })
  features: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ nullable: true })
  couponCode: string;

  @Column({ nullable: true })
  discountAmount: number;

  @Column({ nullable: true })
  taxAmount: number;

  @Column({ nullable: true })
  nextBillingDate: Date;

  @Column({ nullable: true })
  lastPaymentDate: Date;

  @Column({ nullable: true })
  failedPaymentAttempts: number;

  @Column({ nullable: true })
  maxFailedAttempts: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => PaymentEntity, (payment) => payment.subscription)
  payments: PaymentEntity[];
} 