import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationPreference } from '../entities/notification-preference.entity';
import { EmailAnalytics } from '../entities/email-analytics.entity';
import { EmailQueue } from '../entities/email-queue.entity';
import { UnsubscribeDto } from '../dto/notification-preference.dto';

@Injectable()
export class UnsubscribeService {
  constructor(
    @InjectRepository(NotificationPreference)
    private notificationPreferenceRepository: Repository<NotificationPreference>,
    @InjectRepository(EmailAnalytics)
    private emailAnalyticsRepository: Repository<EmailAnalytics>,
    @InjectRepository(EmailQueue)
    private emailQueueRepository: Repository<EmailQueue>,
  ) {}

  async getUnsubscribeLink(userId: string, category?: string): Promise<string> {
    const preferences = await this.notificationPreferenceRepository.findOne({
      where: { userId },
    });

    if (!preferences) {
      throw new Error(`Notification preferences not found for user ${userId}`);
    }

    if (!preferences.unsubscribeToken) {
      // Generate unsubscribe token if it doesn't exist
      preferences.unsubscribeToken = require('crypto').randomBytes(32).toString('hex');
      await this.notificationPreferenceRepository.save(preferences);
    }

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const token = preferences.unsubscribeToken;

    if (category) {
      return `${baseUrl}/unsubscribe?token=${token}&category=${category}`;
    }

    return `${baseUrl}/unsubscribe?token=${token}`;
  }

  async unsubscribeByToken(unsubscribeDto: UnsubscribeDto): Promise<void> {
    const { token, categories } = unsubscribeDto;

    const preferences = await this.notificationPreferenceRepository.findOne({
      where: { unsubscribeToken: token },
    });

    if (!preferences) {
      throw new Error('Invalid unsubscribe token');
    }

    if (categories && categories.length > 0) {
      // Add specific categories to unsubscribed list
      preferences.unsubscribedCategories = [
        ...new Set([...preferences.unsubscribedCategories, ...categories]),
      ];
    } else {
      // Unsubscribe from all emails
      preferences.emailEnabled = false;
    }

    await this.notificationPreferenceRepository.save(preferences);

    // Record the unsubscribe event in analytics
    await this.recordUnsubscribeEvent(preferences.userId, categories);
  }

  async recordUnsubscribeEvent(userId: string, categories?: string[]): Promise<void> {
    // Find all recent email analytics for this user to update with unsubscribe info
    const analyticsList = await this.emailAnalyticsRepository.find({
      where: { userId },
    });

    for (const analytics of analyticsList) {
      analytics.unsubscribeCount += 1;
      await this.emailAnalyticsRepository.save(analytics);
    }
  }

  async isUserUnsubscribed(userId: string, category?: string): Promise<boolean> {
    const preferences = await this.notificationPreferenceRepository.findOne({
      where: { userId },
    });

    if (!preferences) {
      return false; // Default to subscribed if no preferences exist
    }

    // Check if user has disabled all email notifications
    if (!preferences.emailEnabled) {
      return true;
    }

    // Check if user has unsubscribed from specific category
    if (category && preferences.unsubscribedCategories.includes(category)) {
      return true;
    }

    return false;
  }

  async resubscribe(userId: string, categories?: string[]): Promise<void> {
    const preferences = await this.notificationPreferenceRepository.findOne({
      where: { userId },
    });

    if (!preferences) {
      throw new Error(`Notification preferences not found for user ${userId}`);
    }

    if (categories && categories.length > 0) {
      // Remove specific categories from unsubscribed list
      preferences.unsubscribedCategories = preferences.unsubscribedCategories.filter(
        (cat) => !categories.includes(cat),
      );
    } else {
      // Resubscribe to all emails
      preferences.emailEnabled = true;
      preferences.unsubscribedCategories = [];
    }

    await this.notificationPreferenceRepository.save(preferences);
  }

  async getSubscriptionStatus(userId: string): Promise<{
    isFullyUnsubscribed: boolean;
    unsubscribedCategories: string[];
    canReceiveEmails: boolean;
  }> {
    const preferences = await this.notificationPreferenceRepository.findOne({
      where: { userId },
    });

    if (!preferences) {
      return {
        isFullyUnsubscribed: false,
        unsubscribedCategories: [],
        canReceiveEmails: true,
      };
    }

    return {
      isFullyUnsubscribed: !preferences.emailEnabled,
      unsubscribedCategories: preferences.unsubscribedCategories,
      canReceiveEmails: preferences.emailEnabled,
    };
  }
}
