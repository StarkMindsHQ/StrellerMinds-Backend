import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app',
}

export enum NotificationType {
  COURSE_UPDATES = 'course_updates',
  DEADLINES = 'deadlines',
  ANNOUNCEMENTS = 'announcements',
  DIGEST = 'digest',
  SECURITY = 'security',
  PROMOTIONAL = 'promotional',
}

@Entity('notification_preferences')
export class NotificationPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'json', default: {} })
  preferences: Record<NotificationType, {
    channels: NotificationChannel[];
    enabled: boolean;
    frequency?: 'immediate' | 'daily' | 'weekly' | 'never';
  }>;

  @Column({ default: true })
  emailEnabled: boolean;

  @Column({ default: true })
  smsEnabled: boolean;

  @Column({ default: true })
  pushEnabled: boolean;

  @Column({ default: true })
  inAppEnabled: boolean;

  @Column({ name: 'unsubscribe_token', unique: true, nullable: true })
  unsubscribeToken?: string;

  @Column({ name: 'unsubscribed_categories', type: 'simple-array', default: [] })
  unsubscribedCategories: string[];

  @Column({ name: 'created_by', nullable: true })
  createdBy?: string;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}