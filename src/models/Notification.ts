import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../auth/entities/user.entity';

export enum NotificationType {
  SYSTEM = 'SYSTEM',
  COURSE = 'COURSE',
  ASSIGNMENT = 'ASSIGNMENT',
  GRADE = 'GRADE',
  PAYMENT = 'PAYMENT',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
  REMINDER = 'REMINDER',
  SECURITY = 'SECURITY',
  COMPLIANCE = 'COMPLIANCE',
  MARKETING = 'MARKETING',
  SOCIAL = 'SOCIAL',
}

export enum NotificationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum NotificationChannel {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
  WEBHOOK = 'WEBHOOK',
  SLACK = 'SLACK',
  TEAMS = 'TEAMS',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  READ = 'READ',
}

@Entity('notifications')
@Index(['userId', 'status'])
@Index(['type', 'priority'])
@Index(['createdAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @Column({
    type: 'enum',
    enum: NotificationPriority,
    default: NotificationPriority.MEDIUM,
  })
  priority: NotificationPriority;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'text', nullable: true })
  subtitle: string;

  @Column({ type: 'jsonb', nullable: true })
  data: any;

  @Column({ type: 'jsonb', nullable: true })
  templateData: any;

  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.PENDING,
  })
  status: NotificationStatus;

  @Column({ type: 'jsonb', nullable: true })
  channels: NotificationChannel[];

  @Column({ type: 'jsonb', nullable: true })
  deliveryStatus: Record<NotificationChannel, NotificationStatus>;

  @Column({ type: 'jsonb', nullable: true })
  deliveryAttempts: Record<NotificationChannel, number>;

  @Column({ type: 'timestamp', nullable: true })
  scheduledAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ default: false })
  isRead: boolean;

  @Column({ type: 'timestamp', nullable: true })
  readAt: Date;

  @Column({ nullable: true })
  correlationId: string;

  @Column({ nullable: true })
  batchId: string;

  @Column({ nullable: true })
  templateId: string;

  @Column({ type: 'jsonb', nullable: true })
  userPreferences: any;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @Column({ type: 'text', nullable: true })
  imageUrl: string;

  @Column({ type: 'text', nullable: true })
  actionUrl: string;

  @Column({ type: 'text', nullable: true })
  actionText: string;

  @Column({ type: 'jsonb', nullable: true })
  actions: Array<{
    id: string;
    text: string;
    url: string;
    type: 'PRIMARY' | 'SECONDARY' | 'DANGER';
  }>;

  @Column({ default: false })
  isSilent: boolean;

  @Column({ default: false })
  isPersistent: boolean;

  @Column({ default: false })
  requiresAction: boolean;

  @Column({ type: 'text', nullable: true })
  category: string;

  @Column({ type: 'text', nullable: true })
  subcategory: string;

  @Column({ type: 'jsonb', nullable: true })
  tags: string[];

  @Column({ type: 'jsonb', nullable: true })
  localization: Record<string, {
    title: string;
    message: string;
    subtitle?: string;
    actionText?: string;
  }>;

  @Column({ type: 'jsonb', nullable: true })
  deliveryMetadata: Record<NotificationChannel, any>;

  @Column({ type: 'timestamp', nullable: true })
  lastDeliveryAttempt: Date;

  @Column({ type: 'text', nullable: true })
  failureReason: string;

  @Column({ type: 'jsonb', nullable: true })
  retryPolicy: {
    maxRetries: number;
    retryDelay: number;
    backoffMultiplier: number;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
