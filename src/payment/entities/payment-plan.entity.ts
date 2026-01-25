import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BillingCycle } from '../enums';
import { Subscription } from './subscription.entity';

@Entity('payment_plans')
export class PaymentPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar')
  name: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column('varchar', { default: 'USD' })
  currency: string;

  @Column('enum', { enum: BillingCycle, default: BillingCycle.MONTHLY })
  billingCycle: BillingCycle;

  @Column('int', { nullable: true })
  trialDays: number;

  @Column('int', { nullable: true })
  maxSubscribers: number;

  @Column('boolean', { default: true })
  isActive: boolean;

  @Column('json', { nullable: true })
  features: string[];

  @Column('json', { nullable: true })
  metadata: Record<string, any>;

  @OneToMany('Subscription', 'paymentPlan')
  subscriptions: Subscription[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
