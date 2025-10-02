import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum NotificationChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  IN_APP = 'IN_APP',
  PUSH = 'PUSH',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  READ = 'READ',
  CLICKED = 'CLICKED',
}

export enum NotificationType {
  COURSE_UPDATE = 'COURSE_UPDATE',
  NEW_MESSAGE = 'NEW_MESSAGE',
  REMINDER = 'REMINDER',
  PROMOTION = 'PROMOTION',
  ACCOUNT_ALERT = 'ACCOUNT_ALERT',
  COURSE_ENROLLMENT = 'COURSE_ENROLLMENT',
  COURSE_COMPLETION = 'COURSE_COMPLETION',
}

@Entity('notifications')
@Index(['userId', 'createdAt'])
@Index(['status', 'createdAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title: string | null;

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, any> | null; // Additional data like courseId, senderId, link

  @Column({ type: 'enum', enum: NotificationChannel, array: true, default: [] })
  channels: NotificationChannel[];

  @Column({ type: 'enum', enum: NotificationStatus, default: NotificationStatus.PENDING })
  status: NotificationStatus;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  sentAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  readAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  clickedAt: Date | null;

  @ManyToOne(() => User, (user) => user.notifications, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
