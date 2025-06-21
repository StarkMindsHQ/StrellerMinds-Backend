import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { CreateNotificationDto, NotificationPlatform } from '../dto/create-notification.dto';
import { Notification, NotificationStatus, NotificationType } from '../entities/notification.entity';
import { DeviceToken } from '../entities/device-token.entity';
import { NotificationPreferences } from '../entities/notification-preferences.entity';
import { NotificationTemplates } from '../templates/notification-templates';

@Injectable()
export class PushNotificationService {
  getNotificationById(id: string) {
      throw new Error('Method not implemented.');
  }
  private readonly logger = new Logger(PushNotificationService.name);
  private firebaseApp: admin.app.App;

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(DeviceToken)
    private deviceTokenRepository: Repository<DeviceToken>,
    @InjectRepository(NotificationPreferences)
    private preferencesRepository: Repository<NotificationPreferences>,
    private configService: ConfigService
  ) {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    try {
      const serviceAccount = {
        projectId: this.configService.get('FIREBASE_PROJECT_ID'),
        privateKey: this.configService.get('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n'),
        clientEmail: this.configService.get('FIREBASE_CLIENT_EMAIL'),
      };

      this.firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });

      this.logger.log('Firebase Admin initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin', error);
    }
  }

  async sendNotification(dto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationRepository.create({
      ...dto,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : new Date(),
    });

    const savedNotification = await this.notificationRepository.save(notification);

    if (!dto.scheduledAt || new Date(dto.scheduledAt) <= new Date()) {
      await this.processNotification(savedNotification);
    }

    return savedNotification;
  }

  async sendTemplatedNotification(
    type: NotificationType,
    templateData: any,
    userId?: string,
    topic?: string,
    platform: NotificationPlatform = NotificationPlatform.ALL
  ): Promise<Notification> {
    const template = NotificationTemplates.getTemplate(type, templateData);
    
    const dto: CreateNotificationDto = {
      ...template,
      platform,
      userId,
      topic,
    };

    const notification = this.notificationRepository.create({
      ...dto,
      type,
      scheduledAt: new Date(),
    });

    const savedNotification = await this.notificationRepository.save(notification);
    await this.processNotification(savedNotification);

    return savedNotification;
  }

  async processNotification(notification: Notification): Promise<void> {
    try {
      if (notification.userId) {
        await this.sendToUser(notification);
      } else if (notification.topic) {
        await this.sendToTopic(notification);
      } else if (notification.deviceTokens?.length) {
        await this.sendToTokens(notification);
      }

      await this.updateNotificationStatus(notification.id, NotificationStatus.SENT);
    } catch (error) {
      this.logger.error(`Failed to send notification ${notification.id}`, error);
      await this.updateNotificationStatus(
        notification.id, 
        NotificationStatus.FAILED, 
        error.message
      );
    }
  }

  private async sendToUser(notification: Notification): Promise<void> {
    const preferences = await this.getUserPreferences(notification.userId);
    
    if (!this.shouldSendNotification(notification, preferences)) {
      await this.updateNotificationStatus(notification.id, NotificationStatus.CANCELLED);
      return;
    }

    const deviceTokens = await this.getUserDeviceTokens(
      notification.userId, 
      notification.platform
    );

    if (deviceTokens.length === 0) {
      throw new Error('No device tokens found for user');
    }

    const tokens = deviceTokens.map(dt => dt.token);
    await this.sendToTokens({ ...notification, deviceTokens: tokens });
  }

  private async sendToTopic(notification: Notification): Promise<void> {
    const message: admin.messaging.Message = {
      topic: notification.topic,
      notification: {
        title: notification.title,
        body: notification.body,
        imageUrl: notification.imageUrl,
      },
      data: notification.data ? this.stringifyData(notification.data) : undefined,
      android: this.getAndroidConfig(notification),
      apns: this.getApnsConfig(notification),
      webpush: this.getWebpushConfig(notification),
    };

    await admin.messaging().send(message);
  }

  private async sendToTokens(notification: Notification): Promise<void> {
    const tokens = notification.deviceTokens || [];
    if (tokens.length === 0) return;

    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification: {
        title: notification.title,
        body: notification.body,
        imageUrl: notification.imageUrl,
      },
      data: notification.data ? this.stringifyData(notification.data) : undefined,
      android: this.getAndroidConfig(notification),
      apns: this.getApnsConfig(notification),
      webpush: this.getWebpushConfig(notification),
    };

    const response = await admin.messaging().sendMulticast(message);
    await this.handleFailedTokens(response, tokens);
  }

  private async handleFailedTokens(
    response: admin.messaging.BatchResponse, 
    tokens: string[]
  ): Promise<void> {
    const failedTokens: string[] = [];
    
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        failedTokens.push(tokens[idx]);
        this.logger.warn(`Failed to send to token ${tokens[idx]}: ${resp.error?.message}`);
      }
    });

    if (failedTokens.length > 0) {
      await this.deactivateTokens(failedTokens);
    }
  }

  private async deactivateTokens(tokens: string[]): Promise<void> {
    await this.deviceTokenRepository.update(
      { token: { $in: tokens } as any },
      { active: false }
    );
  }

  private getAndroidConfig(notification: Notification): admin.messaging.AndroidConfig {
    return {
      priority: notification.priority === 'high' ? 'high' : 'normal',
      notification: {
        clickAction: notification.clickAction,
        priority: notification.priority === 'high' ? 'high' : 'default',
        defaultSound: !notification.silent,
      },
    };
  }

  private getApnsConfig(notification: Notification): admin.messaging.ApnsConfig {
    return {
      payload: {
        aps: {
          sound: notification.silent ? undefined : 'default',
          badge: 1,
          'content-available': notification.silent ? 1 : undefined,
        },
      },
    };
  }

  private getWebpushConfig(notification: Notification): admin.messaging.WebpushConfig {
    return {
      notification: {
        icon: '/assets/icon-192x192.png',
        clickAction: notification.clickAction,
        requireInteraction: notification.priority === 'high',
      },
    };
  }

  private stringifyData(data: Record<string, any>): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = typeof value === 'string' ? value : JSON.stringify(value);
    }
    return result;
  }

  private async shouldSendNotification(
    notification: Notification, 
    preferences: NotificationPreferences
  ): Promise<boolean> {
    if (!preferences) return true;

    const typeMapping = {
      [NotificationType.COURSE_UPDATE]: preferences.courseUpdates,
      [NotificationType.ASSIGNMENT_DUE]: preferences.assignments,
      [NotificationType.ANNOUNCEMENT]: preferences.announcements,
      [NotificationType.ACHIEVEMENT_UNLOCKED]: preferences.achievements,
      [NotificationType.REMINDER]: preferences.reminders,
      [NotificationType.MARKETING]: preferences.marketing,
      [NotificationType.SYSTEM]: true,
    };

    if (!typeMapping[notification.type]) return false;

    if (this.isInQuietHours(preferences)) return false;

    if (preferences.mutedTopics?.includes(notification.topic)) return false;

    return true;
  }

  private isInQuietHours(preferences: NotificationPreferences): boolean {
    if (!preferences.quietHoursStart || !preferences.quietHoursEnd) return false;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = preferences.quietHoursStart.split(':').map(Number);
    const [endHour, endMin] = preferences.quietHoursEnd.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  private async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    return await this.preferencesRepository.findOne({ where: { userId } });
  }

  private async getUserDeviceTokens(
    userId: string, 
    platform: NotificationPlatform
  ): Promise<DeviceToken[]> {
    const where: any = { userId, active: true };
    
    if (platform !== NotificationPlatform.ALL) {
      where.platform = platform;
    }

    return await this.deviceTokenRepository.find({ where });
  }

  private async updateNotificationStatus(
    id: string, 
    status: NotificationStatus, 
    errorMessage?: string
  ): Promise<void> {
    const updateData: any = { 
      status,
      sentAt: status === NotificationStatus.SENT ? new Date() : undefined,
      errorMessage 
    };

    await this.notificationRepository.update(id, updateData);
  }

  async registerDeviceToken(
    userId: string,
    token: string,
    platform: NotificationPlatform,
    deviceId?: string,
    appVersion?: string
  ): Promise<DeviceToken> {
    const existingToken = await this.deviceTokenRepository.findOne({
      where: { userId, token }
    });

    if (existingToken) {
      existingToken.active = true;
      existingToken.lastUsedAt = new Date();
      existingToken.appVersion = appVersion;
      return await this.deviceTokenRepository.save(existingToken);
    }

    const deviceToken = this.deviceTokenRepository.create({
      userId,
      token,
      platform,
      deviceId,
      appVersion,
      lastUsedAt: new Date(),
    });

    return await this.deviceTokenRepository.save(deviceToken);
  }

  async unregisterDeviceToken(userId: string, token: string): Promise<void> {
    await this.deviceTokenRepository.update(
      { userId, token },
      { active: false }
    );
  }

  async updateUserPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    const existing = await this.preferencesRepository.findOne({
      where: { userId }
    });

    if (existing) {
      Object.assign(existing, preferences);
      return await this.preferencesRepository.save(existing);
    }

    const newPreferences = this.preferencesRepository.create({
      userId,
      ...preferences,
    });

    return await this.preferencesRepository.save(newPreferences);
  }

  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ notifications: Notification[]; total: number }> {
    const [notifications, total] = await this.notificationRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { notifications, total };
  }

  async getScheduledNotifications(): Promise<Notification[]> {
    return await this.notificationRepository.find({
      where: {
        status: NotificationStatus.PENDING,
        scheduledAt: { $lte: new Date() } as any,
      },
    });
  }

  async processScheduledNotifications(): Promise<void> {
    const notifications = await this.getScheduledNotifications();
    
    for (const notification of notifications) {
      try {
        await this.processNotification(notification);
      } catch (error) {
        this.logger.error(`Failed to process scheduled notification ${notification.id}`, error);
      }
    }
  }
}
