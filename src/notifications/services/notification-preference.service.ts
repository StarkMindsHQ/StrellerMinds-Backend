import { Injectable, Logger } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { UserNotificationPreference } from '../entities/user-notification-preference.entity';
import type { UpdateNotificationPreferenceDto } from '../dto/update-preference.dto';
import { NotificationChannel, NotificationType } from '../entities/notification.entity';

@Injectable()
export class NotificationPreferenceService {
  private readonly logger = new Logger(NotificationPreferenceService.name);

  constructor(private readonly preferenceRepository: Repository<UserNotificationPreference>) {}

  async getPreferences(userId: string): Promise<UserNotificationPreference> {
    let preferences = await this.preferenceRepository.findOne({ where: { userId } });

    if (!preferences) {
      // Initialize default preferences if none exist
      preferences = await this.initializeDefaultPreferences(userId);
      this.logger.log(`Initialized default preferences for user ${userId}`);
    }
    return preferences;
  }

  async updatePreferences(
    userId: string,
    dto: UpdateNotificationPreferenceDto,
  ): Promise<UserNotificationPreference> {
    let preferences = await this.preferenceRepository.findOne({ where: { userId } });

    if (!preferences) {
      preferences = this.preferenceRepository.create({ userId });
    }

    // Update general channel preferences
    if (dto.emailEnabled !== undefined) preferences.emailEnabled = dto.emailEnabled;
    if (dto.smsEnabled !== undefined) preferences.smsEnabled = dto.smsEnabled;
    if (dto.inAppEnabled !== undefined) preferences.inAppEnabled = dto.inAppEnabled;
    if (dto.pushEnabled !== undefined) preferences.pushEnabled = dto.pushEnabled;

    // Update type-specific preferences
    if (dto.typePreferences) {
      preferences.typePreferences = { ...preferences.typePreferences, ...dto.typePreferences };
    }

    const savedPreferences = await this.preferenceRepository.save(preferences);
    this.logger.log(`Updated preferences for user ${userId}`);
    return savedPreferences;
  }

  async initializeDefaultPreferences(userId: string): Promise<UserNotificationPreference> {
    const defaultPreferences = this.preferenceRepository.create({
      userId,
      emailEnabled: true,
      smsEnabled: false,
      inAppEnabled: true,
      pushEnabled: false,
      typePreferences: {
        [NotificationType.COURSE_UPDATE]: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
        [NotificationType.NEW_MESSAGE]: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
        [NotificationType.REMINDER]: [NotificationChannel.EMAIL],
        [NotificationType.PROMOTION]: [NotificationChannel.EMAIL],
        [NotificationType.ACCOUNT_ALERT]: [
          NotificationChannel.EMAIL,
          NotificationChannel.IN_APP,
          NotificationChannel.SMS,
        ],
        [NotificationType.COURSE_ENROLLMENT]: [
          NotificationChannel.EMAIL,
          NotificationChannel.IN_APP,
        ],
        [NotificationType.COURSE_COMPLETION]: [
          NotificationChannel.EMAIL,
          NotificationChannel.IN_APP,
        ],
      },
    });
    return this.preferenceRepository.save(defaultPreferences);
  }

  async getPreferredChannelsForType(
    userId: string,
    notificationType: NotificationType,
  ): Promise<NotificationChannel[]> {
    const preferences = await this.getPreferences(userId);

    // Start with general channel enablement
    const enabledChannels: NotificationChannel[] = [];
    if (preferences.emailEnabled) enabledChannels.push(NotificationChannel.EMAIL);
    if (preferences.smsEnabled) enabledChannels.push(NotificationChannel.SMS);
    if (preferences.inAppEnabled) enabledChannels.push(NotificationChannel.IN_APP);
    if (preferences.pushEnabled) enabledChannels.push(NotificationChannel.PUSH);

    // Override with type-specific preferences if they exist
    if (preferences.typePreferences && preferences.typePreferences[notificationType]) {
      return preferences.typePreferences[notificationType] || [];
    }

    return enabledChannels;
  }
}
