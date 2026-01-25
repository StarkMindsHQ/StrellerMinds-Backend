import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { INotificationChannel } from '../../interfaces/notification-channel.interface';
import { NotificationChannel } from '../../entities/notification-preference.entity';
import { Notification, NotificationStatus } from '../../entities/notifications.entity';

@Injectable()
export class InAppChannel implements INotificationChannel {
  private readonly logger = new Logger(InAppChannel.name);
  readonly type = NotificationChannel.IN_APP;

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  async send(notification: Notification): Promise<boolean> {
    try {
      // For In-App, "sending" means just ensuring it's in the DB and marked as SENT
      // It's already in the DB if called from the main service, so we just update status
      notification.status = NotificationStatus.SENT;
      notification.sentAt = new Date();
      await this.notificationRepository.save(notification);
      
      this.logger.log(`In-app notification delivered to user ${notification.userId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to deliver in-app notification to ${notification.userId}: ${error.message}`);
      return false;
    }
  }
}
