import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Notification, NotificationStatus } from '../entities/notification.entity';
import { PushNotificationService } from './push-notification.service';

@Injectable()
export class NotificationRetryService {
  private readonly logger = new Logger(NotificationRetryService.name);
  private readonly MAX_RETRIES = 3;

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    private pushNotificationService: PushNotificationService
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async retryFailedNotifications(): Promise<void> {
    try {
      const failedNotifications = await this.getRetryableNotifications();
      
      for (const notification of failedNotifications) {
        await this.retryNotification(notification);
      }

      if (failedNotifications.length > 0) {
        this.logger.log(`Processed ${failedNotifications.length} retry attempts`);
      }
    } catch (error) {
      this.logger.error('Error processing notification retries', error);
    }
  }

  private async getRetryableNotifications(): Promise<Notification[]> {
    const retryDelay = 5 * 60 * 1000; // 5 minutes
    const retryThreshold = new Date(Date.now() - retryDelay);

    return await this.notificationRepository.find({
      where: {
        status: NotificationStatus.FAILED,
        retryCount: { $lt: this.MAX_RETRIES } as any,
        updatedAt: { $lte: retryThreshold } as any
      },
      take: 50
    });
  }

  private async retryNotification(notification: Notification): Promise<void> {
    try {
      notification.retryCount += 1;
      notification.status = NotificationStatus.PENDING;
      notification.errorMessage = null;

      await this.notificationRepository.save(notification);
      await this.pushNotificationService.processNotification(notification);

      this.logger.log(`Retry successful for notification ${notification.id}`);
    } catch (error) {
      this.logger.error(`Retry failed for notification ${notification.id}`, error);
      
      await this.notificationRepository.update(notification.id, {
        status: NotificationStatus.FAILED,
        errorMessage: error.message
      });
    }
  }

  async getRetryStats(): Promise<{
    pendingRetries: number;
    maxRetriesReached: number;
    totalFailed: number;
  }> {
    const [pendingRetries, maxRetriesReached, totalFailed] = await Promise.all([
      this.notificationRepository.count({
        where: {
          status: NotificationStatus.FAILED,
          retryCount: { $lt: this.MAX_RETRIES } as any
        }
      }),
      this.notificationRepository.count({
        where: {
          status: NotificationStatus.FAILED,
          retryCount: { $gte: this.MAX_RETRIES } as any
        }
      }),
      this.notificationRepository.count({
        where: { status: NotificationStatus.FAILED }
      })
    ]);

    return { pendingRetries, maxRetriesReached, totalFailed };
  }
}