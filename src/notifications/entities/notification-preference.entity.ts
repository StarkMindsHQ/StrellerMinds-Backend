import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

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
  CALENDAR_BOOKING = 'calendar_booking',
  DIGEST = 'digest',
  SECURITY = 'security',
  PROMOTIONAL = 'promotional',
}

export enum DigestFrequency {
  REALTIME = 'realtime',
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  NEVER = 'never',
}

export interface PushToken {
  token: string;
  platform: 'ios' | 'android' | 'web';
  deviceId: string;
  createdAt: Date;
  lastUsedAt?: Date;
}

@Entity('notification_preferences')
export class NotificationPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'json', default: {} })
  preferences: Partial<
    Record<
      NotificationType,
      {
        channels: NotificationChannel[];
        enabled: boolean;
        frequency?: 'immediate' | 'daily' | 'weekly' | 'never';
      }
    >
  >;

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

  @Column({ name: 'quiet_hours_enabled', default: false })
  quietHoursEnabled: boolean;

  @Column({ name: 'quiet_hours_start', nullable: true })
  quietHoursStart: string; // HH:mm format

  @Column({ name: 'quiet_hours_end', nullable: true })
  quietHoursEnd: string; // HH:mm format

  @Column({ name: 'timezone', default: 'UTC' })
  timezone: string;

  @Column({ name: 'do_not_disturb', default: false })
  doNotDisturb: boolean;

  // ─── Digest settings ──────────────────────────────────────────────────────

  @Column({ type: 'enum', enum: DigestFrequency, default: DigestFrequency.REALTIME })
  digestFrequency: DigestFrequency;

  @Column({ type: 'time', nullable: true })
  digestTime: string; // 'HH:MM'

  @Column({ type: 'varchar', length: 50, nullable: true })
  digestTimezone: string;

  // ─── Push tokens ──────────────────────────────────────────────────────────

  @Column({ type: 'jsonb', default: [] })
  pushTokens: PushToken[];

  // ─── Locale ───────────────────────────────────────────────────────────────

  @Column({ name: 'preferred_locale', type: 'varchar', length: 10, default: 'en' })
  preferredLocale: string;

  // ─── Audit ────────────────────────────────────────────────────────────────

  @Column({ name: 'created_by', nullable: true })
  createdBy?: string;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
