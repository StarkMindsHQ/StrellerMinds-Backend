import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { NotificationChannel } from './notification-preference.entity';

export enum NotificationStatus {
  PENDING = 'PENDING',
  QUEUED = 'QUEUED',
  SENDING = 'SENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({
    type: 'enum',
    enum: NotificationChannel,
  })
  channel: NotificationChannel;

  @Column()
  type: string; // e.g. 'course_update', 'system_alert'

  @Column({ nullable: true })
  templateId: string;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.PENDING,
  })
  status: NotificationStatus;

  @Column({ nullable: true })
  scheduledAt: Date;

  @Column({ nullable: true })
  sentAt: Date;

  @Column({ default: 0 })
  retryCount: number;

  @Column({ nullable: true })
  errorMessage: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
