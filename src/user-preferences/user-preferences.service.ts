import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserPreferences } from './entities/user-preferences.entity';
import { NotificationSettings } from './entities/notification-settings.entity';
import { CreateUserPreferencesDto } from './dtos/create-user-preferences.dto';
import { CreateNotificationSettingsDto } from './dtos/create-notification-settings.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class UserPreferencesService {
  constructor(
    @InjectRepository(UserPreferences)
    private readonly preferencesRepo: Repository<UserPreferences>,
    @InjectRepository(NotificationSettings)
    private readonly notificationRepo: Repository<NotificationSettings>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async create(userId: string, dto: CreateUserPreferencesDto): Promise<UserPreferences> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    let notificationSettings: NotificationSettings | undefined;
    if (dto.notificationSettings) {
      notificationSettings = this.notificationRepo.create(dto.notificationSettings);
      await this.notificationRepo.save(notificationSettings);
    }

    const preferences = this.preferencesRepo.create({
      user,
      learningCustomization: dto.learningCustomization,
      notificationSettings,
      personalizationData: dto.personalizationData,
      analytics: { lastUpdated: new Date(), usageStats: {} },
    });
    return this.preferencesRepo.save(preferences);
  }

  async findByUserId(userId: string): Promise<UserPreferences> {
    const preferences = await this.preferencesRepo.findOne({
      where: { user: { id: userId } },
      relations: ['user', 'notificationSettings'],
    });
    if (!preferences) throw new NotFoundException('Preferences not found');
    return preferences;
  }

  async update(userId: string, dto: CreateUserPreferencesDto): Promise<UserPreferences> {
    const preferences = await this.findByUserId(userId);
    if (!preferences) throw new NotFoundException('Preferences not found');

    if (dto.notificationSettings) {
      if (preferences.notificationSettings) {
        this.notificationRepo.merge(preferences.notificationSettings, dto.notificationSettings);
        await this.notificationRepo.save(preferences.notificationSettings);
      } else {
        const newSettings = this.notificationRepo.create(dto.notificationSettings);
        await this.notificationRepo.save(newSettings);
        preferences.notificationSettings = newSettings;
      }
    }

    if (dto.learningCustomization) {
      preferences.learningCustomization = dto.learningCustomization;
    }
    if (dto.personalizationData) {
      preferences.personalizationData = dto.personalizationData;
    }
    preferences.analytics = { ...preferences.analytics, lastUpdated: new Date() };
    return this.preferencesRepo.save(preferences);
  }

  // Example: Learning path customization logic
  async getCustomizedLearningPath(userId: string): Promise<any> {
    const preferences = await this.findByUserId(userId);
    // Example logic: Suggest topics based on preferredTopics
    return {
      suggestedTopics: preferences.learningCustomization?.preferredTopics || [],
      pace: preferences.learningCustomization?.learningPace || 'medium',
      goals: preferences.learningCustomization?.learningGoals || '',
    };
  }

  // Example: Notification rules engine
  async shouldNotify(userId: string, eventType: string): Promise<boolean> {
    const preferences = await this.findByUserId(userId);
    const rules = preferences.notificationSettings?.rules || {};
    // Example: Check if eventType is enabled in rules
    return rules[eventType] !== false;
  }

  // Analytics tracking
  async trackPreferenceUsage(userId: string, action: string): Promise<void> {
    const preferences = await this.findByUserId(userId);
    preferences.analytics = {
      ...preferences.analytics,
      usageStats: {
        ...(preferences.analytics?.usageStats || {}),
        [action]: (preferences.analytics?.usageStats?.[action] || 0) + 1,
      },
      lastUpdated: new Date(),
    };
    await this.preferencesRepo.save(preferences);
  }
}
