import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  JoinColumn,
  Index,
  Check,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { PaymentStatus, PaymentMethod } from '../enums';

@Entity('payments')
@Index(['userId', 'status', 'createdAt'])
@Index(['transactionId'])
@Index(['gatewayReferenceId'])
@Index(['status'])
@Check(`"amount" > 0`)
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column('enum', { enum: PaymentMethod })
  paymentMethod: PaymentMethod;

  @Column('varchar', { nullable: true })
  transactionId: string;

  @Column('varchar', { nullable: true })
  gatewayReferenceId: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('text', { nullable: true })
  failureReason: string;

  @Column('varchar', { nullable: true })
  invoiceId: string;

  @Column('varchar', { nullable: true })
  subscriptionId: string;

  @Column('json', { nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column('timestamp', { nullable: true })
  completedAt: Date;
}
