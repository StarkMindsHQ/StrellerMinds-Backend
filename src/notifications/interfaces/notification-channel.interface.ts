import { NotificationChannel } from '../entities/notification-preference.entity';
import { Notification } from '../entities/notifications.entity';

export interface NotificationPayload {
  userId: string;
  title: string;
  content: string;
  metadata?: Record<string, any>;
  recipient?: string; // email address, phone number, etc.
}

export interface INotificationChannel {
  readonly type: NotificationChannel;
  send(notification: Notification): Promise<boolean>;
}
