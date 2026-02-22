import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';
import { NotificationChannel } from './notification-preference.entity';

export enum DeliveryEventType {
  SENT = 'sent',
  DELIVERED = 'delivered',
  OPENED = 'opened',
  CLICKED = 'clicked',
  DISMISSED = 'dismissed',
  FAILED = 'failed',
  BOUNCED = 'bounced',
}

@Entity('notification_delivery_events')
@Index(['notificationId', 'channel'])
@Index(['userId', 'createdAt'])
export class NotificationDeliveryEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  notificationId: string;

  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  @Column({ type: 'enum', enum: NotificationChannel })
  channel: NotificationChannel;

  @Column({ type: 'enum', enum: DeliveryEventType })
  eventType: DeliveryEventType;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'varchar', length: 500, nullable: true })
  errorMessage: string;

  @CreateDateColumn()
  createdAt: Date;
}
