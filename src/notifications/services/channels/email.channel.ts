import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { INotificationChannel } from '../../interfaces/notification-channel.interface';
import { NotificationChannel } from '../../entities/notification-preference.entity';
import { Notification } from '../../entities/notifications.entity';

@Injectable()
export class EmailChannel implements INotificationChannel {
  private readonly logger = new Logger(EmailChannel.name);
  readonly type = NotificationChannel.EMAIL;

  constructor(private readonly mailerService: MailerService) {}

  async send(notification: Notification): Promise<boolean> {
    try {
      const recipient = notification.metadata?.email || notification.userId; // Fallback to userId if email not in metadata

      await this.mailerService.sendMail({
        to: recipient,
        subject: notification.title,
        html: notification.content,
        // text: notification.content, // Could add text version
      });

      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${notification.userId}: ${error.message}`);
      return false;
    }
  }
}
