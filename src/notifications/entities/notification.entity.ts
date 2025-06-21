import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm"
import { User } from "../../users/entities/user.entity"

import { NotificationPlatform, NotificationPriority } from '../dto/create-notification.dto';
@Index(['status', 'scheduledAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  body: string;

  @Column({ nullable: true })
  imageUrl?: string;

  @Column({ nullable: true })
  clickAction?: string;

  @Column({
    type: 'enum',
    enum: NotificationPlatform,
    default: NotificationPlatform.ALL
  })
  platform: NotificationPlatform;

  @Column({
    type: 'enum',
    enum: NotificationPriority,
    default: NotificationPriority.NORMAL
  })
  priority: NotificationPriority;

  @Column({
    type: 'enum',
    enum: Notification
  })
  type: Notification;

  @Column({
    type: 'enum',
    enum: Notification,
    default: Notification.PENDING
  })
  status: Notification;

  @Column('json', { nullable: true })
  data?: Record<string, any>;

  @Column('json', { nullable: true })
  deviceTokens?: string[];

  @Column({ nullable: true })
  @Index()
  userId?: string;

  @Column({ nullable: true })
  topic?: string;

  @Column({ type: 'timestamp', nullable: true })
  scheduledAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  sentAt?: Date;

  @Column({ default: false })
  silent: boolean;

  @Column({ nullable: true })
  errorMessage?: string;

  @Column({ default: 0 })
  retryCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
  static PENDING: any;
}