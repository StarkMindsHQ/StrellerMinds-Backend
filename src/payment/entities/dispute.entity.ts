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
import { DisputeStatus } from '../enums';

@Entity('disputes')
export class Dispute {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  paymentId: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('varchar')
  externalDisputeId: string;

  @Column('enum', {
    enum: DisputeStatus,
    default: DisputeStatus.INITIATED,
  })
  status: DisputeStatus;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column('varchar', { default: 'USD' })
  currency: string;

  @Column('varchar', { nullable: true })
  reason: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('timestamp')
  dueDate: Date;

  @Column('json', { nullable: true })
  evidence: string[];

  @Column('text', { nullable: true })
  resolution: string;

  @Column('timestamp', { nullable: true })
  resolvedAt: Date;

  @Column('json', { nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
