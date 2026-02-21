import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { Notification, NotificationStatus } from '../entities/notifications.entity';
import {
  NotificationChannel,
  NotificationPreference,
  NotificationType,
  DigestFrequency,
  PushToken,
} from '../entities/notification-preference.entity';
import {
  NotificationDeliveryEvent,
  DeliveryEventType,
} from '../entities/notification-delivery.entity';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface SendNotificationDto {
  userId: string;
  type: string;
  title: string;
  content: string;
  channel?: NotificationChannel;
  preferredChannels?: NotificationChannel[];
  metadata?: Record<string, any>;
  scheduledAt?: Date;
  templateId?: string;
}

export interface NotificationQueryDto {
  type?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface RegisterPushTokenDto {
  token: string;
  platform: 'ios' | 'android' | 'web';
  deviceId: string;
}

export interface NotificationStats {
  total: number;
  byStatus: Partial<Record<NotificationStatus, number>>;
  deliveryRate: number;
  readRate: number;
  avgDeliveryTimeMs: number;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationRepo: Repository<Notification>,

    @InjectRepository(NotificationPreference)
    private preferenceRepo: Repository<NotificationPreference>,

    @InjectRepository(NotificationDeliveryEvent)
    private deliveryEventRepo: Repository<NotificationDeliveryEvent>,

    @InjectQueue('notifications')
    private notificationQueue: Queue,

    private eventEmitter: EventEmitter2,
  ) {}

  // ─── Send / Create ────────────────────────────────────────────────────────

  async send(dto: SendNotificationDto): Promise<Notification[]> {
    const prefs = await this.getOrCreatePreferences(dto.userId);

    // Resolve channels
    let channels: NotificationChannel[] = [];
    if (dto.preferredChannels?.length) {
      channels = dto.preferredChannels;
    } else if (dto.channel) {
      channels = [dto.channel];
    } else {
      channels = this.resolveChannels(dto.type as NotificationType, prefs);
    }

    // Check Do Not Disturb / quiet hours
    const canDeliverNow = this.shouldDeliverNow(prefs);
    const scheduledAt = dto.scheduledAt ?? (!canDeliverNow ? this.nextAvailableTime(prefs) : null);

    const results: Notification[] = [];

    for (const channel of channels) {
      const notification = this.notificationRepo.create({
        userId: dto.userId,
        type: dto.type,
        channel,
        title: dto.title,
        content: dto.content,
        metadata: dto.metadata,
        templateId: dto.templateId,
        status: scheduledAt ? NotificationStatus.QUEUED : NotificationStatus.PENDING,
        scheduledAt,
      });

      const saved = await this.notificationRepo.save(notification);

      if (!scheduledAt) {
        await this.notificationQueue.add(
          'send',
          { notificationId: saved.id },
          { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
        );
      }

      this.eventEmitter.emit('notification.created', saved);
      results.push(saved);
    }

    return results;
  }

  /**
   * Called by the queue processor to actually deliver a single notification.
   */
  async processNotification(notificationId: string): Promise<void> {
    const notification = await this.notificationRepo.findOne({
      where: { id: notificationId },
    });
    if (!notification) {
      this.logger.warn(`Notification ${notificationId} not found`);
      return;
    }

    notification.status = NotificationStatus.SENDING;
    await this.notificationRepo.save(notification);

    try {
      // Dispatch to the appropriate channel queue job
      switch (notification.channel) {
        case NotificationChannel.EMAIL:
          await this.notificationQueue.add('send-email', { notificationId });
          break;
        case NotificationChannel.PUSH:
          await this.notificationQueue.add('send-push', { notificationId });
          break;
        case NotificationChannel.IN_APP:
          // IN_APP: mark as delivered immediately and push over WebSocket
          this.eventEmitter.emit('notification.websocket', notification);
          await this.notificationRepo.update(notificationId, {
            status: NotificationStatus.DELIVERED,
            sentAt: new Date(),
            deliveredAt: new Date(),
          });
          await this.trackDeliveryEvent(
            notificationId,
            notification.userId,
            NotificationChannel.IN_APP,
            DeliveryEventType.DELIVERED,
          );
          return;
        default:
          this.logger.warn(`Unhandled channel: ${notification.channel}`);
      }

      await this.notificationRepo.update(notificationId, {
        status: NotificationStatus.SENT,
        sentAt: new Date(),
      });
    } catch (error) {
      await this.notificationRepo.update(notificationId, {
        status: NotificationStatus.FAILED,
        errorMessage: (error as Error).message,
        retryCount: () => 'retry_count + 1',
      });
    }
  }

  // ─── Queries ──────────────────────────────────────────────────────────────

  async findByUser(
    userId: string,
    query: NotificationQueryDto,
  ): Promise<{ data: Notification[]; total: number; unreadCount: number }> {
    const { type, status, startDate, endDate, page = 1, limit = 20 } = query;

    const qb = this.notificationRepo
      .createQueryBuilder('n')
      .where('n.userId = :userId', { userId })
      .orderBy('n.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (type) qb.andWhere('n.type = :type', { type });
    if (status) qb.andWhere('n.status = :status', { status });
    if (startDate) qb.andWhere('n.createdAt >= :startDate', { startDate });
    if (endDate) qb.andWhere('n.createdAt <= :endDate', { endDate });

    const [data, total] = await qb.getManyAndCount();

    const unreadCount = await this.notificationRepo.count({
      where: { userId, status: NotificationStatus.DELIVERED },
    });

    return { data, total, unreadCount };
  }

  async markAsRead(userId: string, notificationId: string): Promise<Notification> {
    const notification = await this.notificationRepo.findOne({
      where: { id: notificationId, userId },
    });
    if (!notification) throw new NotFoundException('Notification not found');

    await this.notificationRepo.update(notificationId, {
      status: NotificationStatus.READ,
      readAt: new Date(),
    });

    await this.trackDeliveryEvent(
      notificationId,
      userId,
      notification.channel,
      DeliveryEventType.OPENED,
    );

    this.eventEmitter.emit('notification.read', { notificationId, userId });

    return { ...notification, status: NotificationStatus.READ, readAt: new Date() };
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.notificationRepo.update(
      { userId, status: NotificationStatus.DELIVERED },
      { status: NotificationStatus.READ, readAt: new Date() },
    );
    this.eventEmitter.emit('notification.all-read', { userId });
    return result.affected ?? 0;
  }

  async dismiss(userId: string, notificationId: string): Promise<void> {
    const notification = await this.notificationRepo.findOne({
      where: { id: notificationId, userId },
    });
    if (!notification) throw new NotFoundException('Notification not found');

    await this.notificationRepo.update(notificationId, {
      status: NotificationStatus.DISMISSED,
    });
  }

  // ─── Delivery Tracking ────────────────────────────────────────────────────

  async trackDeliveryEvent(
    notificationId: string,
    userId: string,
    channel: NotificationChannel,
    eventType: DeliveryEventType,
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.deliveryEventRepo.save({
      notificationId,
      userId,
      channel,
      eventType,
      metadata,
    });

    if (eventType === DeliveryEventType.DELIVERED) {
      await this.notificationRepo.update(notificationId, {
        status: NotificationStatus.DELIVERED,
        deliveredAt: new Date(),
      });
    }
  }

  // ─── Preferences ──────────────────────────────────────────────────────────

  async getPreferences(userId: string): Promise<NotificationPreference> {
    return this.getOrCreatePreferences(userId);
  }

  async updatePreferences(
    userId: string,
    updates: Partial<NotificationPreference>,
  ): Promise<NotificationPreference> {
    const prefs = await this.getOrCreatePreferences(userId);
    Object.assign(prefs, updates);
    return this.preferenceRepo.save(prefs);
  }

  async registerPushToken(userId: string, dto: RegisterPushTokenDto): Promise<void> {
    const prefs = await this.getOrCreatePreferences(userId);
    const tokens: PushToken[] = prefs.pushTokens ?? [];

    const filtered = tokens.filter((t) => t.deviceId !== dto.deviceId);
    filtered.push({
      token: dto.token,
      platform: dto.platform,
      deviceId: dto.deviceId,
      createdAt: new Date(),
    });

    await this.preferenceRepo.update(prefs.id, { pushTokens: filtered });
  }

  async removePushToken(userId: string, deviceId: string): Promise<void> {
    const prefs = await this.getOrCreatePreferences(userId);
    const tokens = (prefs.pushTokens ?? []).filter((t) => t.deviceId !== deviceId);
    await this.preferenceRepo.update(prefs.id, { pushTokens: tokens });
  }

  /**
   * Check whether delivery should happen now (respects quiet hours / DND).
   */
  shouldDeliverNow(prefs: NotificationPreference): boolean {
    if (prefs.doNotDisturb) return false;
    if (!prefs.quietHoursEnabled || !prefs.quietHoursStart || !prefs.quietHoursEnd) return true;

    const now = new Date();
    const [startH, startM] = prefs.quietHoursStart.split(':').map(Number);
    const [endH, endM] = prefs.quietHoursEnd.split(':').map(Number);

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (startMinutes <= endMinutes) {
      return !(currentMinutes >= startMinutes && currentMinutes < endMinutes);
    }
    // Overnight quiet hours (e.g. 22:00 – 08:00)
    return !(currentMinutes >= startMinutes || currentMinutes < endMinutes);
  }

  // ─── Digest ───────────────────────────────────────────────────────────────

  async sendDigestForUser(userId: string): Promise<void> {
    const prefs = await this.getOrCreatePreferences(userId);
    if (!prefs.emailEnabled) return;

    const since = this.digestSince(prefs.digestFrequency);
    const notifications = await this.notificationRepo.find({
      where: {
        userId,
        status: In([NotificationStatus.DELIVERED, NotificationStatus.SENT]),
        createdAt: Between(since, new Date()),
        isDigest: false,
      },
      order: { createdAt: 'DESC' },
    });

    if (!notifications.length) return;

    // Create a digest summary notification
    const digest = await this.notificationRepo.save(
      this.notificationRepo.create({
        userId,
        type: 'digest',
        channel: NotificationChannel.EMAIL,
        title: `You have ${notifications.length} unread notifications`,
        content: `Summary of notifications since ${since.toLocaleDateString()}`,
        metadata: {
          digestCount: notifications.length,
          digestNotificationIds: notifications.map((n) => n.id),
        },
        isDigest: true,
        status: NotificationStatus.PENDING,
      }),
    );

    // Mark source notifications as included in this digest
    await this.notificationRepo.update(
      { id: In(notifications.map((n) => n.id)) },
      { isDigest: true, digestBatchId: digest.id },
    );

    await this.notificationQueue.add('send-email', { notificationId: digest.id }, { attempts: 2 });
  }

  // ─── Analytics ────────────────────────────────────────────────────────────

  async getStats(userId: string, startDate: Date, endDate: Date): Promise<NotificationStats> {
    const notifications = await this.notificationRepo.find({
      where: { userId, createdAt: Between(startDate, endDate) },
    });

    const byStatus = notifications.reduce(
      (acc, n) => ({ ...acc, [n.status]: (acc[n.status] ?? 0) + 1 }),
      {} as Partial<Record<NotificationStatus, number>>,
    );

    const sent =
      (byStatus[NotificationStatus.SENT] ?? 0) +
      (byStatus[NotificationStatus.DELIVERED] ?? 0) +
      (byStatus[NotificationStatus.READ] ?? 0);
    const read = byStatus[NotificationStatus.READ] ?? 0;

    const deliveryRate = notifications.length > 0 ? (sent / notifications.length) * 100 : 0;
    const readRate = sent > 0 ? (read / sent) * 100 : 0;

    const avgRow = await this.deliveryEventRepo
      .createQueryBuilder('e')
      .select('AVG(EXTRACT(EPOCH FROM (e.createdAt - n.createdAt)) * 1000)', 'avgMs')
      .innerJoin(Notification, 'n', 'n.id = e.notificationId')
      .where('e.userId = :userId', { userId })
      .andWhere('e.eventType = :type', { type: DeliveryEventType.DELIVERED })
      .andWhere('e.createdAt BETWEEN :start AND :end', { start: startDate, end: endDate })
      .getRawOne<{ avgMs: string }>();

    return {
      total: notifications.length,
      byStatus,
      deliveryRate: Math.round(deliveryRate * 100) / 100,
      readRate: Math.round(readRate * 100) / 100,
      avgDeliveryTimeMs: Math.round(parseFloat(avgRow?.avgMs ?? '0')),
    };
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private async getOrCreatePreferences(userId: string): Promise<NotificationPreference> {
    let prefs = await this.preferenceRepo.findOne({ where: { userId } });
    if (!prefs) {
      prefs = this.preferenceRepo.create({
        userId,
        emailEnabled: true,
        smsEnabled: true,
        pushEnabled: true,
        inAppEnabled: true,
        preferredLocale: 'en',
        pushTokens: [],
        preferences: {},
        unsubscribedCategories: [],
        digestFrequency: DigestFrequency.REALTIME,
      });
      await this.preferenceRepo.save(prefs);
    }
    return prefs;
  }

  private resolveChannels(
    type: NotificationType,
    prefs: NotificationPreference,
  ): NotificationChannel[] {
    const typePrefs = prefs.preferences?.[type];
    if (typePrefs?.enabled && typePrefs.channels?.length) {
      return typePrefs.channels.filter((ch) => this.isChannelEnabled(ch, prefs));
    }

    // Default fallback
    const defaults: NotificationChannel[] = [];
    if (prefs.inAppEnabled) defaults.push(NotificationChannel.IN_APP);
    if (prefs.emailEnabled) defaults.push(NotificationChannel.EMAIL);
    return defaults;
  }

  private isChannelEnabled(ch: NotificationChannel, prefs: NotificationPreference): boolean {
    switch (ch) {
      case NotificationChannel.EMAIL:
        return prefs.emailEnabled;
      case NotificationChannel.SMS:
        return prefs.smsEnabled;
      case NotificationChannel.PUSH:
        return prefs.pushEnabled;
      case NotificationChannel.IN_APP:
        return prefs.inAppEnabled;
      default:
        return true;
    }
  }

  private nextAvailableTime(prefs: NotificationPreference): Date {
    if (!prefs.quietHoursEnd) {
      return new Date(Date.now() + 60 * 60 * 1000);
    }
    const [h, m] = prefs.quietHoursEnd.split(':').map(Number);
    const next = new Date();
    next.setHours(h, m, 0, 0);
    if (next <= new Date()) next.setDate(next.getDate() + 1);
    return next;
  }

  private digestSince(frequency: DigestFrequency): Date {
    const ms: Record<DigestFrequency, number> = {
      [DigestFrequency.REALTIME]: 0,
      [DigestFrequency.HOURLY]: 3_600_000,
      [DigestFrequency.DAILY]: 86_400_000,
      [DigestFrequency.WEEKLY]: 604_800_000,
      [DigestFrequency.NEVER]: 0,
    };
    return new Date(Date.now() - (ms[frequency] ?? 86_400_000));
  }
}
