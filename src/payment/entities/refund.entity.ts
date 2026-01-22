import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { RefundStatus } from '../enums';

@Entity('refunds')
export class Refund {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  paymentId: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column('varchar', { default: 'USD' })
  currency: string;

  @Column('enum', {
    enum: RefundStatus,
    default: RefundStatus.REQUESTED,
  })
  status: RefundStatus;

  @Column('varchar', { nullable: true })
  gatewayRefundId: string;

  @Column('text')
  reason: string;

  @Column('text', { nullable: true })
  notes: string;

  @Column('timestamp', { nullable: true })
  processedAt: Date;

  @Column('json', { nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
