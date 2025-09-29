import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PaymentMethod, PaymentStatus, PaymentType } from './payment.entity';

@Entity('archived_payments')
export class ArchivedPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'enum', enum: PaymentMethod })
  paymentMethod: PaymentMethod;

  @Column({ type: 'enum', enum: PaymentStatus })
  status: PaymentStatus;

  @Column({ type: 'enum', enum: PaymentType })
  type: PaymentType;

  @Column({ nullable: true })
  transactionId: string;

  @Column({ nullable: true })
  receiptUrl: string;

  @Column({ nullable: true })
  refundReason: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column()
  userId: string;

  @Column({ nullable: true })
  courseId: string;

  @Column({ nullable: true })
  subscriptionId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column()
  archivedAt: Date;
}
