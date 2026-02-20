import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EmailTemplateType } from './email-template.entity';

export enum EmailStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SENT = 'sent',
  FAILED = 'failed',
  DELIVERED = 'delivered',
  OPENED = 'opened',
  CLICKED = 'clicked',
  BOUNCED = 'bounced',
  UNSUBSCRIBED = 'unsubscribed',
}

@Entity('email_queue')
export class EmailQueue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  recipientEmail: string;

  @Column({ nullable: true })
  recipientName?: string;

  @Column({ type: 'uuid', nullable: true })
  userId?: string;

  @Column({ type: 'enum', enum: EmailTemplateType, nullable: true })
  templateType?: EmailTemplateType;

  @Column({ type: 'enum', enum: EmailStatus, default: EmailStatus.PENDING })
  status: EmailStatus;

  @Column({ type: 'text', nullable: true })
  subject?: string;

  @Column({ type: 'text', nullable: true })
  htmlContent?: string;

  @Column({ type: 'text', nullable: true })
  textContent?: string;

  @Column({ type: 'json', nullable: true })
  templateData?: Record<string, any>;

  @Column({ default: 0 })
  retryCount: number;

  @Column({ name: 'max_retries', default: 3 })
  maxRetries: number;

  @Column({ type: 'timestamp', nullable: true })
  scheduledAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  sentAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  openedAt?: Date;

  @Column({ type: 'json', nullable: true })
  trackingData?: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  deliveryResponse?: Record<string, any>;

  @Column({ name: 'created_by', nullable: true })
  createdBy?: string;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
