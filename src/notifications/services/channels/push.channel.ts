import { Injectable, Logger } from '@nestjs/common';
import { INotificationChannel } from '../../interfaces/notification-channel.interface';
import { NotificationChannel } from '../../entities/notification-preference.entity';
import { Notification } from '../../entities/notifications.entity';

@Injectable()
export class PushChannel implements INotificationChannel {
  private readonly logger = new Logger(PushChannel.name);
  readonly type = NotificationChannel.PUSH;

  async send(notification: Notification): Promise<boolean> {
    try {
      const pushToken = notification.metadata?.pushToken;
      if (!pushToken) {
        this.logger.warn(`No push token found for user ${notification.userId}`);
        return false;
      }

      this.logger.log(`[Push Simulation] Sending Push to ${notification.userId}: ${notification.title}`);
      // Integrate with FCM or OneSignal here
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to send Push to ${notification.userId}: ${error.message}`);
      return false;
    }
  }
}
