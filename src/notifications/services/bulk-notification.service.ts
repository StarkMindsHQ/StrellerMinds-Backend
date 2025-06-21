import { HealthCheckResult } from './../../monitoring/types/monitoring_types';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PushNotificationService } from './push-notification.service';
import { CreateNotificationDto, NotificationPlatform } from '../dto/create-notification.dto';
import { NotificationType } from '../entities/notification.entity';
import { DeviceToken } from '../entities/device-token.entity';

export interface BulkNotificationJob {
  id: string;
  title: string;
  body: string;
  platform: NotificationPlatform;
  type: NotificationType;
  targetUsers?: string[];
  targetTopic?: string;
  scheduledAt?: Date;
  data?: Record<string, any>;
  imageUrl?: string;
  clickAction?: string;
}

@Injectable()
export class BulkNotificationService {
  private readonly logger = new Logger(BulkNotificationService.name);
  private readonly BATCH_SIZE = 500;

  constructor(
    @InjectRepository(DeviceToken)
    private deviceTokenRepository: Repository<DeviceToken>,
    private pushNotificationService: PushNotificationService
  ) {}

  async sendBulkNotification(job: BulkNotificationJob): Promise<void> {
    try {
      this.logger.log(`Starting bulk notification job: ${job.id}`);

      if (job.targetTopic) {
        await this.sendToTopic(job);
      } else if (job.targetUsers?.length) {
        await this.sendToUsers(job);
      } else {
        await this.sendToAllUsers(job);
      }

      this.logger.log(`Completed bulk notification job: ${job.id}`);
    } catch (error) {
      this.logger.error(`Failed bulk notification job: ${job.id}`, error);
      throw error;
    }
  }

  private async sendToTopic(job: BulkNotificationJob): Promise<void> {
    const dto: CreateNotificationDto = {
      title: job.title,
      body: job.body,
      platform: job.platform,
      topic: job.targetTopic,
      data: job.data,
      imageUrl: job.imageUrl,
      clickAction: job.clickAction,
      scheduledAt: job.scheduledAt?.toISOString()
    };

    await this.pushNotificationService.sendNotification(dto);
  }

  private async sendToUsers(job: BulkNotificationJob): Promise<void> {
    const userBatches = this.chunkArray(job.targetUsers, this.BATCH_SIZE);

    for (const batch of userBatches) {
      const deviceTokens = await this.getDeviceTokensForUsers(batch, job.platform);
      
      if (deviceTokens.length > 0) {
        const dto: CreateNotificationDto = {
          title: job.title,
          body: job.body,
          platform: job.platform,
          deviceTokens: deviceTokens.map(dt => dt.token),
          data: job.data,
          imageUrl: job.imageUrl,
          clickAction: job.clickAction,
          scheduledAt: job.scheduledAt?.toISOString()
        };

        await this.pushNotificationService.sendNotification(dto);
      }
    }
  }

  private async sendToAllUsers(job: BulkNotificationJob): Promise<void> {
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const deviceTokens = await this.deviceTokenRepository.find({
        where: {
          active: true,
          platform: job.platform === NotificationPlatform.ALL ? undefined : job.platform
        },
        take: this.BATCH_SIZE,
        skip: offset
      });

      if (deviceTokens.length === 0) {
        hasMore = false;
        break;
      }

      const dto: CreateNotificationDto = {
        title: job.title,
        body: job.body,
        platform: job.platform,
        deviceTokens: deviceTokens.map(dt => dt.token),
        data: job.data,
        imageUrl: job.imageUrl,
        clickAction: job.clickAction,
        scheduledAt: job.scheduledAt?.toISOString()
      };

      await this.pushNotificationService.sendNotification(dto);
      offset += this.BATCH_SIZE;
    }
  }

  private async getDeviceTokensForUsers(
    userIds: string[], 
    platform: NotificationPlatform
  ): Promise<DeviceToken[]> {
    const whereClause: any = {
      userId: { $in: userIds } as any,
      active: true
    };

    if (platform !== NotificationPlatform.ALL) {
      whereClause.platform = platform;
    }

    return await this.deviceTokenRepository.find({ where: whereClause });
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

