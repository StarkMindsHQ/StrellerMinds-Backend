import { Injectable, Logger } from '@nestjs/common';
import { INotificationChannel } from '../../interfaces/notification-channel.interface';
import { NotificationChannel } from '../../entities/notification-preference.entity';
import { Notification } from '../../entities/notifications.entity';

@Injectable()
export class SmsChannel implements INotificationChannel {
  private readonly logger = new Logger(SmsChannel.name);
  readonly type = NotificationChannel.SMS;

  async send(notification: Notification): Promise<boolean> {
    try {
      const phoneNumber = notification.metadata?.phoneNumber;
      if (!phoneNumber) {
        this.logger.warn(`No phone number found for user ${notification.userId}`);
        return false;
      }

      this.logger.log(`[SMS Simulation] Sending SMS to ${phoneNumber}: ${notification.title}`);
      // Integrate with Twilio or similar here

      return true;
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${notification.userId}: ${error.message}`);
      return false;
    }
  }
}
