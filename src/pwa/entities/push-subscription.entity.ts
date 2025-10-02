import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: PushSubscriptionKeys;
}

@Entity('push_subscriptions')
@Index(['userId', 'isActive'])
@Index(['endpoint'], { unique: true })
export class PushSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @Index()
  userId?: string;

  @Column({ type: 'text' })
  endpoint: string;

  @Column({ type: 'varchar', length: 255 })
  p256dhKey: string;

  @Column({ type: 'varchar', length: 255 })
  authKey: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  userAgent?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  deviceType?: string;

  @Column({ type: 'boolean', default: true })
  @Index()
  isActive: boolean;

  @Column({ type: 'json', nullable: true })
  preferences?: {
    types: string[];
    frequency: 'immediate' | 'daily' | 'weekly';
    quietHours?: {
      start: string;
      end: string;
      timezone: string;
    };
  };

  @Column({ type: 'json', nullable: true })
  metadata?: {
    browser: string;
    os: string;
    country?: string;
    language?: string;
  };

  @Column({ type: 'timestamp', nullable: true })
  lastNotificationSent?: Date;

  @Column({ type: 'integer', default: 0 })
  notificationCount: number;

  @Column({ type: 'integer', default: 0 })
  failureCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper method to get subscription data
  getSubscriptionData(): PushSubscriptionData {
    return {
      endpoint: this.endpoint,
      keys: {
        p256dh: this.p256dhKey,
        auth: this.authKey,
      },
    };
  }
}
