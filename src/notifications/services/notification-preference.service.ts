import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationPreference } from '../entities/notification-preference.entity';
import { CreateNotificationPreferenceDto, UpdateNotificationPreferenceDto } from '../dto/notification-preference.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class NotificationPreferenceService {
  constructor(
    @InjectRepository(NotificationPreference)
    private notificationPreferenceRepository: Repository<NotificationPreference>,
  ) {}

  async createPreferences(createPrefDto: CreateNotificationPreferenceDto): Promise<NotificationPreference> {
    // Check if preferences already exist for this user
    let preferences = await this.notificationPreferenceRepository.findOne({
      where: { userId: createPrefDto.userId },
    });

    if (preferences) {
      throw new Error(`Preferences already exist for user ${createPrefDto.userId}`);
    }

    preferences = new NotificationPreference();
    preferences.userId = createPrefDto.userId;
    preferences.preferences = createPrefDto.preferences || {};
    preferences.emailEnabled = createPrefDto.emailEnabled ?? true;
    preferences.smsEnabled = createPrefDto.smsEnabled ?? true;
    preferences.pushEnabled = createPrefDto.pushEnabled ?? true;
    preferences.inAppEnabled = createPrefDto.inAppEnabled ?? true;
    preferences.quietHoursEnabled = createPrefDto.quietHoursEnabled ?? false;
    preferences.quietHoursStart = createPrefDto.quietHoursStart;
    preferences.quietHoursEnd = createPrefDto.quietHoursEnd;
    preferences.timezone = createPrefDto.timezone || 'UTC';
    preferences.doNotDisturb = createPrefDto.doNotDisturb ?? false;
    preferences.unsubscribeToken = uuidv4(); // Generate unique unsubscribe token

    return await this.notificationPreferenceRepository.save(preferences);
  }

  async getPreferences(userId: string): Promise<NotificationPreference> {
    return await this.notificationPreferenceRepository.findOne({
      where: { userId },
    });
  }

  async updatePreferences(userId: string, updatePrefDto: UpdateNotificationPreferenceDto): Promise<NotificationPreference> {
    const preferences = await this.notificationPreferenceRepository.findOne({
      where: { userId },
    });

    if (!preferences) {
      throw new Error(`Preferences not found for user ${userId}`);
    }

    if (updatePrefDto.preferences !== undefined) {
      preferences.preferences = { ...preferences.preferences, ...updatePrefDto.preferences };
    }

    if (updatePrefDto.emailEnabled !== undefined) {
      preferences.emailEnabled = updatePrefDto.emailEnabled;
    }

    if (updatePrefDto.smsEnabled !== undefined) {
      preferences.smsEnabled = updatePrefDto.smsEnabled;
    }

    if (updatePrefDto.pushEnabled !== undefined) {
      preferences.pushEnabled = updatePrefDto.pushEnabled;
    }

    if (updatePrefDto.inAppEnabled !== undefined) {
      preferences.inAppEnabled = updatePrefDto.inAppEnabled;
    }

    if (updatePrefDto.doNotDisturb !== undefined) {
      preferences.doNotDisturb = updatePrefDto.doNotDisturb;
    }

    if (updatePrefDto.quietHoursEnabled !== undefined) {
      preferences.quietHoursEnabled = updatePrefDto.quietHoursEnabled;
    }

    if (updatePrefDto.quietHoursStart !== undefined) {
      preferences.quietHoursStart = updatePrefDto.quietHoursStart;
    }

    if (updatePrefDto.quietHoursEnd !== undefined) {
      preferences.quietHoursEnd = updatePrefDto.quietHoursEnd;
    }

    if (updatePrefDto.timezone !== undefined) {
      preferences.timezone = updatePrefDto.timezone;
    }

    return await this.notificationPreferenceRepository.save(preferences);
  }

  async shouldDeliverNow(userId: string): Promise<boolean> {
    const preferences = await this.getPreferences(userId);
    if (!preferences) return true;

    if (preferences.doNotDisturb) return false;

    if (preferences.quietHoursEnabled && preferences.quietHoursStart && preferences.quietHoursEnd) {
      return !this.isInQuietHours(
        preferences.quietHoursStart,
        preferences.quietHoursEnd,
        preferences.timezone,
      );
    }

    return true;
  }

  private isInQuietHours(start: string, end: string, timezone: string): boolean {
    try {
      const now = new Date();
      const userTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
      const currentHour = userTime.getHours();
      const currentMinute = userTime.getMinutes();
      const currentTimeInMinutes = currentHour * 60 + currentMinute;

      const [startHour, startMinute] = start.split(':').map(Number);
      const [endHour, endMinute] = end.split(':').map(Number);
      
      const startTimeInMinutes = startHour * 60 + startMinute;
      const endTimeInMinutes = endHour * 60 + endMinute;

      if (startTimeInMinutes < endTimeInMinutes) {
        return currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes < endTimeInMinutes;
      } else {
        // Overnights (e.g., 22:00 to 07:00)
        return currentTimeInMinutes >= startTimeInMinutes || currentTimeInMinutes < endTimeInMinutes;
      }
    } catch (error) {
      return false; // Default to not in quiet hours if error
    }
  }

  async toggleChannel(userId: string, channel: 'email' | 'sms' | 'push' | 'inApp', enabled: boolean): Promise<NotificationPreference> {
    const preferences = await this.notificationPreferenceRepository.findOne({
      where: { userId },
    });

    if (!preferences) {
      throw new Error(`Preferences not found for user ${userId}`);
    }

    switch (channel) {
      case 'email':
        preferences.emailEnabled = enabled;
        break;
      case 'sms':
        preferences.smsEnabled = enabled;
        break;
      case 'push':
        preferences.pushEnabled = enabled;
        break;
      case 'inApp':
        preferences.inAppEnabled = enabled;
        break;
    }

    return await this.notificationPreferenceRepository.save(preferences);
  }

  async getUnsubscribeToken(userId: string): Promise<string> {
    let preferences = await this.notificationPreferenceRepository.findOne({
      where: { userId },
    });

    if (!preferences) {
      // Create default preferences if they don't exist
      preferences = new NotificationPreference();
      preferences.userId = userId;
      preferences.unsubscribeToken = uuidv4();
      preferences = await this.notificationPreferenceRepository.save(preferences);
    }

    if (!preferences.unsubscribeToken) {
      preferences.unsubscribeToken = uuidv4();
      await this.notificationPreferenceRepository.save(preferences);
    }

    return preferences.unsubscribeToken;
  }

  async unsubscribeByToken(token: string, categories?: string[]): Promise<void> {
    const preferences = await this.notificationPreferenceRepository.findOne({
      where: { unsubscribeToken: token },
    });

    if (!preferences) {
      throw new Error('Invalid unsubscribe token');
    }

    if (categories && categories.length > 0) {
      // Add specific categories to unsubscribed list
      preferences.unsubscribedCategories = [...new Set([...preferences.unsubscribedCategories, ...categories])];
    } else {
      // Unsubscribe from all emails
      preferences.emailEnabled = false;
    }

    await this.notificationPreferenceRepository.save(preferences);
  }

  async isSubscribed(userId: string, category?: string): Promise<boolean> {
    const preferences = await this.notificationPreferenceRepository.findOne({
      where: { userId },
    });

    if (!preferences) {
      return true; // Default to subscribed if no preferences exist
    }

    // Check if user has disabled all email notifications
    if (!preferences.emailEnabled) {
      return false;
    }

    // Check if user has unsubscribed from specific category
    if (category && preferences.unsubscribedCategories.includes(category)) {
      return false;
    }

    return true;
  }
}