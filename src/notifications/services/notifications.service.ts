import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ModuleRef } from '@nestjs/core';
import { Notification, NotificationStatus } from '../entities/notifications.entity';
import { NotificationChannel, NotificationType } from '../entities/notification-preference.entity';
import { SendNotificationDto } from '../dto/send-notification.dto';
import { NotificationPreferenceService } from './notification-preference.service';
import { INotificationChannel } from '../interfaces/notification-channel.interface';
import { EmailChannel } from './channels/email.channel';
import { SmsChannel } from './channels/sms.channel';
import { PushChannel } from './channels/push.channel';
import { InAppChannel } from './channels/in-app.channel';

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  private channels: Map<NotificationChannel, INotificationChannel> = new Map();

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly preferenceService: NotificationPreferenceService,
    private readonly moduleRef: ModuleRef,
  ) {}

  onModuleInit() {
    this.channels.set(NotificationChannel.EMAIL, this.moduleRef.get(EmailChannel));
    this.channels.set(NotificationChannel.SMS, this.moduleRef.get(SmsChannel));
    this.channels.set(NotificationChannel.PUSH, this.moduleRef.get(PushChannel));
    this.channels.set(NotificationChannel.IN_APP, this.moduleRef.get(InAppChannel));
  }

  async send(dto: SendNotificationDto): Promise<Notification[]> {
    const { userId, type, preferredChannels, scheduledAt } = dto;

    // 1. Get user preferences
    const preferences = await this.preferenceService.getPreferences(userId);
    
    // 2. Determine which channels to use
    let channelsToUse: NotificationChannel[] = [];
    
    if (preferredChannels && preferredChannels.length > 0) {
      channelsToUse = preferredChannels;
    } else if (preferences && preferences.preferences[type]) {
      const typePrefs = preferences.preferences[type];
      if (typePrefs.enabled) {
        channelsToUse = typePrefs.channels;
      }
    } else {
      // Default fallback channels if no preferences found
      channelsToUse = [NotificationChannel.IN_APP, NotificationChannel.EMAIL];
    }

    // Filter out disabled channels globally for the user
    if (preferences) {
      channelsToUse = channelsToUse.filter(channel => {
        if (channel === NotificationChannel.EMAIL) return preferences.emailEnabled;
        if (channel === NotificationChannel.SMS) return preferences.smsEnabled;
        if (channel === NotificationChannel.PUSH) return preferences.pushEnabled;
        if (channel === NotificationChannel.IN_APP) return preferences.inAppEnabled;
        return true;
      });
    }

    // 3. Check for delivery optimization (e.g. DND, Quiet Hours)
    const canDeliverNow = await this.preferenceService.shouldDeliverNow(userId);
    
    // If it's a high priority notification, we might bypass quiet hours (logic could be added)
    const effectiveScheduledAt = scheduledAt || (!canDeliverNow ? this.calculateNextAvailableTime(preferences) : null);

    // 4. Create and send/queue notifications for each channel
    const results: Notification[] = [];
    for (const channelType of channelsToUse) {
      const notification = this.notificationRepository.create({
        userId,
        channel: channelType,
        type,
        title: dto.title,
        content: dto.content,
        metadata: dto.metadata,
        status: effectiveScheduledAt ? NotificationStatus.QUEUED : NotificationStatus.PENDING,
        scheduledAt: effectiveScheduledAt,
      });

      const savedNotification = await this.notificationRepository.save(notification);
      
      if (!effectiveScheduledAt) {
        // Process immediately (in real app, this would be pushed to a queue)
        await this.processNotification(savedNotification);
      }
      
      results.push(savedNotification);
    }

    return results;
  }

  async processNotification(notification: Notification): Promise<void> {
    const channel = this.channels.get(notification.channel);
    if (!channel) {
      this.logger.error(`Channel ${notification.channel} not found`);
      notification.status = NotificationStatus.FAILED;
      notification.errorMessage = `Channel ${notification.channel} not found`;
      await this.notificationRepository.save(notification);
      return;
    }

    notification.status = NotificationStatus.SENDING;
    await this.notificationRepository.save(notification);

    const success = await channel.send(notification);
    
    if (success) {
      notification.status = NotificationStatus.SENT;
      notification.sentAt = new Date();
    } else {
      notification.status = NotificationStatus.FAILED;
      notification.retryCount += 1;
      // Logic for retry could be added here or handled by a queue system
    }

    await this.notificationRepository.save(notification);
  }

  private calculateNextAvailableTime(preferences: any): Date {
    // Basic logic: if in quiet hours, schedule for the end of quiet hours
    if (!preferences || !preferences.quietHoursEnd) {
      // Default: 1 hour from now if we don't know when to resume
      return new Date(Date.now() + 60 * 60 * 1000);
    }

    const [hours, minutes] = preferences.quietHoursEnd.split(':').map(Number);
    const nextTime = new Date();
    nextTime.setHours(hours, minutes, 0, 0);
    
    // If that time is in the past for today, set it for tomorrow
    if (nextTime <= new Date()) {
      nextTime.setDate(nextTime.getDate() + 1);
    }
    
    return nextTime;
  }
}
