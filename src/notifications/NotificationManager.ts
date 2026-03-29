import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Notification, NotificationChannel, NotificationStatus, NotificationPriority } from '../models/Notification';
import { User } from '../auth/entities/user.entity';

export interface NotificationRequest {
  userId?: string;
  userIds?: string[];
  type: string;
  priority?: NotificationPriority;
  title: string;
  message: string;
  subtitle?: string;
  data?: any;
  templateData?: any;
  channels?: NotificationChannel[];
  scheduledAt?: Date;
  expiresAt?: Date;
  correlationId?: string;
  batchId?: string;
  templateId?: string;
  imageUrl?: string;
  actionUrl?: string;
  actionText?: string;
  actions?: Array<{
    id: string;
    text: string;
    url: string;
    type: 'PRIMARY' | 'SECONDARY' | 'DANGER';
  }>;
  isSilent?: boolean;
  isPersistent?: boolean;
  requiresAction?: boolean;
  category?: string;
  subcategory?: string;
  tags?: string[];
  localization?: Record<string, {
    title: string;
    message: string;
    subtitle?: string;
    actionText?: string;
  }>;
  metadata?: any;
  retryPolicy?: {
    maxRetries: number;
    retryDelay: number;
    backoffMultiplier: number;
  };
}

export interface BulkNotificationRequest extends Omit<NotificationRequest, 'userId'> {
  userIds: string[];
  batchSize?: number;
  delayBetweenBatches?: number;
}

export interface ScheduledNotificationRequest extends NotificationRequest {
  scheduleType: 'ONCE' | 'RECURRING';
  recurringPattern?: {
    type: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'CRON';
    pattern: string;
    endDate?: Date;
  };
}

@Injectable()
export class NotificationManager {
  private readonly logger = new Logger(NotificationManager.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly dataSource: DataSource,
  ) {}

  async sendNotification(request: NotificationRequest): Promise<Notification> {
    try {
      const notification = this.notificationRepository.create({
        ...request,
        status: NotificationStatus.PENDING,
        channels: request.channels || [NotificationChannel.IN_APP],
        deliveryStatus: {},
        deliveryAttempts: {},
        retryPolicy: request.retryPolicy || {
          maxRetries: 3,
          retryDelay: 5000, // 5 seconds
          backoffMultiplier: 2,
        },
      });

      const savedNotification = await this.notificationRepository.save(notification);
      
      this.logger.debug(`Notification created: ${savedNotification.id}`);
      
      // Trigger immediate processing for high priority notifications
      if (savedNotification.priority === NotificationPriority.URGENT || 
          savedNotification.priority === NotificationPriority.HIGH) {
        await this.processNotification(savedNotification.id);
      }

      return savedNotification;
    } catch (error) {
      this.logger.error(`Failed to create notification: ${error.message}`, error.stack);
      throw error;
    }
  }

  async sendBulkNotification(request: BulkNotificationRequest): Promise<Notification[]> {
    const { userIds, batchSize = 100, delayBetweenBatches = 1000, ...notificationData } = request;
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.logger.log(`Starting bulk notification to ${userIds.length} users with batch ID: ${batchId}`);

    const notifications: Notification[] = [];
    
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      
      const batchNotifications = batch.map(userId => 
        this.notificationRepository.create({
          ...notificationData,
          userId,
          batchId,
          status: NotificationStatus.PENDING,
          channels: notificationData.channels || [NotificationChannel.IN_APP],
          deliveryStatus: {},
          deliveryAttempts: {},
          retryPolicy: notificationData.retryPolicy || {
            maxRetries: 3,
            retryDelay: 5000,
            backoffMultiplier: 2,
          },
        })
      );

      const savedBatch = await this.notificationRepository.save(batchNotifications);
      notifications.push(...savedBatch);

      // Process high priority notifications immediately
      const highPriorityNotifications = savedBatch.filter(n => 
        n.priority === NotificationPriority.URGENT || n.priority === NotificationPriority.HIGH
      );
      
      for (const notification of highPriorityNotifications) {
        await this.processNotification(notification.id);
      }

      // Add delay between batches to prevent overwhelming
      if (i + batchSize < userIds.length && delayBetweenBatches > 0) {
        await this.delay(delayBetweenBatches);
      }
    }

    this.logger.log(`Bulk notification completed: ${notifications.length} notifications created`);
    
    return notifications;
  }

  async scheduleNotification(request: ScheduledNotificationRequest): Promise<Notification> {
    const notification = this.notificationRepository.create({
      ...request,
      status: NotificationStatus.PENDING,
      channels: request.channels || [NotificationChannel.IN_APP],
      deliveryStatus: {},
      deliveryAttempts: {},
      scheduledAt: request.scheduledAt,
      metadata: {
        ...request.metadata,
        scheduleType: request.scheduleType,
        recurringPattern: request.recurringPattern,
      },
      retryPolicy: request.retryPolicy || {
        maxRetries: 3,
        retryDelay: 5000,
        backoffMultiplier: 2,
      },
    });

    const savedNotification = await this.notificationRepository.save(notification);
    
    this.logger.debug(`Scheduled notification created: ${savedNotification.id} for ${request.scheduledAt}`);
    
    return savedNotification;
  }

  async sendToAllUsers(request: Omit<NotificationRequest, 'userId' | 'userIds'>): Promise<Notification[]> {
    // Get all active users
    const userRepository = this.dataSource.getRepository(User);
    const users = await userRepository.find({ where: { isActive: true } });
    
    const userIds = users.map(user => user.id);
    
    return this.sendBulkNotification({
      ...request,
      userIds,
    });
  }

  async sendToRole(request: Omit<NotificationRequest, 'userId' | 'userIds'> & { role: string }): Promise<Notification[]> {
    const userRepository = this.dataSource.getRepository(User);
    const users = await userRepository.find({ where: { role: request.role, isActive: true } });
    
    const userIds = users.map(user => user.id);
    
    return this.sendBulkNotification({
      ...request,
      userIds,
    });
  }

  async processNotification(notificationId: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const notification = await queryRunner.manager.findOne(Notification, {
        where: { id: notificationId },
      });

      if (!notification) {
        throw new Error(`Notification not found: ${notificationId}`);
      }

      if (notification.status !== NotificationStatus.PENDING) {
        this.logger.debug(`Notification ${notificationId} already processed or in progress`);
        return;
      }

      // Update status to processing
      notification.status = NotificationStatus.PROCESSING;
      notification.lastDeliveryAttempt = new Date();
      await queryRunner.manager.save(notification);

      // Process each channel
      const channels = notification.channels || [NotificationChannel.IN_APP];
      const deliveryPromises = channels.map(channel => 
        this.processChannel(queryRunner, notification, channel)
      );

      await Promise.allSettled(deliveryPromises);

      // Update final status
      await this.updateNotificationStatus(queryRunner, notification);

      await queryRunner.commitTransaction();
      
      this.logger.debug(`Notification ${notificationId} processed successfully`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to process notification ${notificationId}: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async processChannel(
    queryRunner: any,
    notification: Notification,
    channel: NotificationChannel,
  ): Promise<void> {
    try {
      // Initialize delivery status if not exists
      if (!notification.deliveryStatus) {
        notification.deliveryStatus = {};
      }
      if (!notification.deliveryAttempts) {
        notification.deliveryAttempts = {};
      }

      // Increment attempt count
      notification.deliveryAttempts[channel] = (notification.deliveryAttempts[channel] || 0) + 1;

      // Simulate channel processing (in real implementation, this would call actual channel services)
      const success = await this.simulateChannelDelivery(notification, channel);

      if (success) {
        notification.deliveryStatus[channel] = NotificationStatus.SENT;
        this.logger.debug(`Notification ${notification.id} sent via ${channel}`);
      } else {
        notification.deliveryStatus[channel] = NotificationStatus.FAILED;
        this.logger.warn(`Notification ${notification.id} failed via ${channel}`);
      }

      await queryRunner.manager.save(notification);
    } catch (error) {
      notification.deliveryStatus[channel] = NotificationStatus.FAILED;
      await queryRunner.manager.save(notification);
      
      this.logger.error(`Channel ${channel} processing failed for notification ${notification.id}: ${error.message}`);
    }
  }

  private async simulateChannelDelivery(notification: Notification, channel: NotificationChannel): Promise<boolean> {
    // Simulate different success rates for different channels
    const successRates = {
      [NotificationChannel.IN_APP]: 0.95,
      [NotificationChannel.EMAIL]: 0.85,
      [NotificationChannel.SMS]: 0.90,
      [NotificationChannel.PUSH]: 0.80,
      [NotificationChannel.WEBHOOK]: 0.75,
      [NotificationChannel.SLACK]: 0.85,
      [NotificationChannel.TEAMS]: 0.85,
    };

    const successRate = successRates[channel] || 0.8;
    return Math.random() < successRate;
  }

  private async updateNotificationStatus(queryRunner: any, notification: Notification): Promise<void> {
    const deliveryStatus = notification.deliveryStatus || {};
    const channels = Object.keys(deliveryStatus);
    
    if (channels.length === 0) {
      notification.status = NotificationStatus.FAILED;
      notification.failureReason = 'No channels processed';
    } else {
      const allSent = channels.every(channel => deliveryStatus[channel] === NotificationStatus.SENT);
      const anySent = channels.some(channel => deliveryStatus[channel] === NotificationStatus.SENT);
      const allFailed = channels.every(channel => deliveryStatus[channel] === NotificationStatus.FAILED);

      if (allSent) {
        notification.status = NotificationStatus.SENT;
      } else if (anySent) {
        notification.status = NotificationStatus.DELIVERED;
      } else if (allFailed) {
        notification.status = NotificationStatus.FAILED;
        notification.failureReason = 'All channels failed';
      }
    }

    await queryRunner.manager.save(notification);
  }

  async retryFailedNotifications(): Promise<number> {
    const failedNotifications = await this.notificationRepository.find({
      where: {
        status: NotificationStatus.FAILED,
      },
      relations: ['user'],
    });

    let retriedCount = 0;

    for (const notification of failedNotifications) {
      const maxRetries = notification.retryPolicy?.maxRetries || 3;
      const totalAttempts = Object.values(notification.deliveryAttempts || {}).reduce((sum, attempts) => sum + attempts, 0);

      if (totalAttempts < maxRetries) {
        // Reset to pending for retry
        notification.status = NotificationStatus.PENDING;
        notification.deliveryStatus = {};
        
        await this.notificationRepository.save(notification);
        await this.processNotification(notification.id);
        
        retriedCount++;
      }
    }

    this.logger.log(`Retried ${retriedCount} failed notifications`);
    return retriedCount;
  }

  async markAsRead(notificationId: string, userId?: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, ...(userId && { userId }) },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    notification.isRead = true;
    notification.readAt = new Date();
    notification.status = NotificationStatus.READ;

    return this.notificationRepository.save(notification);
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.notificationRepository
      .createQueryBuilder()
      .update(Notification)
      .set({ 
        isRead: true, 
        readAt: new Date(), 
        status: NotificationStatus.READ 
      })
      .where('userId = :userId', { userId })
      .andWhere('isRead = :isRead', { isRead: false })
      .execute();

    this.logger.log(`Marked ${result.affected} notifications as read for user ${userId}`);
    return result.affected;
  }

  async getUserNotifications(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      status?: NotificationStatus[];
      type?: string[];
      priority?: NotificationPriority[];
      unreadOnly?: boolean;
    },
  ): Promise<[Notification[], number]> {
    const queryBuilder = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId });

    if (options?.status?.length) {
      queryBuilder.andWhere('notification.status IN (:...status)', { status: options.status });
    }

    if (options?.type?.length) {
      queryBuilder.andWhere('notification.type IN (:...type)', { type: options.type });
    }

    if (options?.priority?.length) {
      queryBuilder.andWhere('notification.priority IN (:...priority)', { priority: options.priority });
    }

    if (options?.unreadOnly) {
      queryBuilder.andWhere('notification.isRead = :isRead', { isRead: false });
    }

    queryBuilder
      .orderBy('notification.createdAt', 'DESC')
      .addOrderBy('notification.priority', 'DESC');

    if (options?.limit) {
      queryBuilder.limit(options.limit);
    }

    if (options?.offset) {
      queryBuilder.offset(options.offset);
    }

    return queryBuilder.getManyAndCount();
  }

  async deleteNotification(notificationId: string, userId?: string): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, ...(userId && { userId }) },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    await this.notificationRepository.remove(notification);
  }

  async deleteExpiredNotifications(): Promise<number> {
    const result = await this.notificationRepository
      .createQueryBuilder()
      .delete()
      .where('expiresAt < :now', { now: new Date() })
      .execute();

    this.logger.log(`Deleted ${result.affected} expired notifications`);
    return result.affected;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getNotificationStatistics(userId?: string): Promise<any> {
    const queryBuilder = this.notificationRepository
      .createQueryBuilder('notification')
      .select([
        'notification.status',
        'notification.type',
        'notification.priority',
        'COUNT(*) as count',
      ]);

    if (userId) {
      queryBuilder.where('notification.userId = :userId', { userId });
    }

    const stats = await queryBuilder
      .groupBy('notification.status, notification.type, notification.priority')
      .getRawMany();

    const totalNotifications = await this.notificationRepository.count({
      ...(userId && { where: { userId } }),
    });

    const unreadNotifications = await this.notificationRepository.count({
      where: {
        ...(userId && { userId }),
        isRead: false,
      },
    });

    return {
      totalNotifications,
      unreadNotifications,
      statistics: stats,
      generatedAt: new Date(),
    };
  }
}
