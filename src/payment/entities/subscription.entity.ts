import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { PaymentPlan } from './payment-plan.entity';
import { SubscriptionStatus, BillingCycle } from '../enums';

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('uuid')
  paymentPlanId: string;

  @ManyToOne('PaymentPlan', 'subscriptions', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'paymentPlanId' })
  paymentPlan: PaymentPlan;

  @Column('enum', {
    enum: SubscriptionStatus,
    default: SubscriptionStatus.PENDING,
  })
  status: SubscriptionStatus;

  @Column('enum', { enum: BillingCycle })
  billingCycle: BillingCycle;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  currentAmount: number;

  @Column('varchar', { nullable: true })
  externalSubscriptionId: string;

  @Column('timestamp')
  startDate: Date;

  @Column('timestamp', { nullable: true })
  nextBillingDate: Date;

  @Column('timestamp', { nullable: true })
  endDate: Date;

  @Column('timestamp', { nullable: true })
  cancelledAt: Date;

  @Column('varchar', { nullable: true })
  cancellationReason: string;

  @Column('int', { default: 0 })
  failedPaymentCount: number;

  @Column('json', { nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
