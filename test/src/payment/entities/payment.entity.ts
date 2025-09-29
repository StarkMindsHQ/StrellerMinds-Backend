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
import { InvoiceEntity } from './invoice.entity';

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export enum PaymentType {
  COURSE_PURCHASE = 'course_purchase',
  SUBSCRIPTION = 'subscription',
  RENEWAL = 'renewal',
  UPGRADE = 'upgrade',
  REFUND = 'refund',
}

@Entity('payments')
export class PaymentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  stripePaymentIntentId: string;

  @Column()
  amount: number; // Amount in cents

  @Column()
  currency: string;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({
    type: 'enum',
    enum: PaymentType,
  })
  type: PaymentType;

  @Column({ nullable: true })
  courseId?: string;

  @Column({ nullable: true })
  subscriptionId?: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  failureReason: string;

  @Column({ nullable: true })
  refundReason: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ nullable: true })
  customerEmail: string;

  @Column({ nullable: true })
  customerName: string;

  @Column({ nullable: true })
  billingAddress: string;

  @Column({ nullable: true })
  taxAmount: number;

  @Column({ nullable: true })
  discountAmount: number;

  @Column({ nullable: true })
  couponCode: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  completedAt: Date;

  @Column({ nullable: true })
  refundedAt: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => InvoiceEntity, (invoice) => invoice.payment)
  invoices: InvoiceEntity[];
} 