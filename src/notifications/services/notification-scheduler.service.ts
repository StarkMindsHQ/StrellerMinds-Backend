import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PushNotificationService } from './push-notification.service';

@Injectable()
export class NotificationSchedulerService {
  private readonly logger = new Logger(NotificationSchedulerService.name);

  constructor(private readonly pushNotificationService: PushNotificationService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleScheduledNotifications() {
    try {
      await this.pushNotificationService.processScheduledNotifications();
    } catch (error) {
      this.logger.error('Failed to process scheduled notifications', error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyCleanup() {
    try {
      this.logger.log('Running daily notification cleanup');
    } catch (error) {
      this.logger.error('Failed to run daily cleanup', error);
    }
  }
}
