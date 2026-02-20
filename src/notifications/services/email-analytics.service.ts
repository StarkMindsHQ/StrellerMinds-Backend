import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailAnalytics } from '../entities/email-analytics.entity';
import { EmailQueue } from '../entities/email-queue.entity';

@Injectable()
export class EmailAnalyticsService {
  constructor(
    @InjectRepository(EmailAnalytics)
    private emailAnalyticsRepository: Repository<EmailAnalytics>,
    @InjectRepository(EmailQueue)
    private emailQueueRepository: Repository<EmailQueue>,
  ) {}

  async recordEmailSent(emailQueueId: string): Promise<void> {
    const analytics = await this.getOrCreateAnalytics(emailQueueId);
    analytics.sentCount += 1;
    await this.updateMetrics(analytics);
    await this.emailAnalyticsRepository.save(analytics);
  }

  async recordEmailDelivered(emailQueueId: string): Promise<void> {
    const analytics = await this.getOrCreateAnalytics(emailQueueId);
    analytics.deliveredCount += 1;
    await this.updateMetrics(analytics);
    await this.emailAnalyticsRepository.save(analytics);
  }

  async recordEmailOpened(emailQueueId: string): Promise<void> {
    const analytics = await this.getOrCreateAnalytics(emailQueueId);
    analytics.openCount += 1;
    await this.updateMetrics(analytics);
    await this.emailAnalyticsRepository.save(analytics);
  }

  async recordEmailClicked(emailQueueId: string): Promise<void> {
    const analytics = await this.getOrCreateAnalytics(emailQueueId);
    analytics.clickCount += 1;
    await this.updateMetrics(analytics);
    await this.emailAnalyticsRepository.save(analytics);
  }

  async recordBounce(emailQueueId: string): Promise<void> {
    const analytics = await this.getOrCreateAnalytics(emailQueueId);
    analytics.bounceCount += 1;
    await this.updateMetrics(analytics);
    await this.emailAnalyticsRepository.save(analytics);
  }

  async recordComplaint(emailQueueId: string): Promise<void> {
    const analytics = await this.getOrCreateAnalytics(emailQueueId);
    analytics.complaintCount += 1;
    await this.updateMetrics(analytics);
    await this.emailAnalyticsRepository.save(analytics);
  }

  async recordUnsubscribe(emailQueueId: string): Promise<void> {
    const analytics = await this.getOrCreateAnalytics(emailQueueId);
    analytics.unsubscribeCount += 1;
    await this.updateMetrics(analytics);
    await this.emailAnalyticsRepository.save(analytics);
  }

  private async getOrCreateAnalytics(emailQueueId: string): Promise<EmailAnalytics> {
    let analytics = await this.emailAnalyticsRepository.findOne({
      where: { emailQueueId },
    });

    if (!analytics) {
      // Get email queue details to populate analytics
      const emailQueue = await this.emailQueueRepository.findOne({
        where: { id: emailQueueId },
      });

      if (!emailQueue) {
        throw new Error(`Email queue with ID ${emailQueueId} not found`);
      }

      analytics = new EmailAnalytics();
      analytics.emailQueueId = emailQueueId;
      analytics.userId = emailQueue.userId;
      analytics.recipientEmail = emailQueue.recipientEmail;
      analytics.subject = emailQueue.subject;
      analytics.metrics = {};
      analytics.eventLogs = [];
    }

    return analytics;
  }

  private async updateMetrics(analytics: EmailAnalytics): Promise<void> {
    // Calculate engagement rates
    analytics.metrics = {
      openRate: analytics.sentCount > 0 ? (analytics.openCount / analytics.sentCount) * 100 : 0,
      clickRate:
        analytics.deliveredCount > 0 ? (analytics.clickCount / analytics.deliveredCount) * 100 : 0,
      bounceRate: analytics.sentCount > 0 ? (analytics.bounceCount / analytics.sentCount) * 100 : 0,
      complaintRate:
        analytics.sentCount > 0 ? (analytics.complaintCount / analytics.sentCount) * 100 : 0,
      unsubscribeRate:
        analytics.sentCount > 0 ? (analytics.unsubscribeCount / analytics.sentCount) * 100 : 0,
    };
  }

  async getAnalyticsForEmail(emailQueueId: string): Promise<EmailAnalytics> {
    return await this.emailAnalyticsRepository.findOne({
      where: { emailQueueId },
    });
  }

  async getAnalyticsForUser(userId: string): Promise<EmailAnalytics[]> {
    return await this.emailAnalyticsRepository.find({
      where: { userId },
    });
  }

  async getAnalyticsForRecipient(recipientEmail: string): Promise<EmailAnalytics[]> {
    return await this.emailAnalyticsRepository.find({
      where: { recipientEmail },
    });
  }

  async getOverallAnalytics(): Promise<any> {
    const allAnalytics = await this.emailAnalyticsRepository.find();

    if (allAnalytics.length === 0) {
      return {
        totalEmails: 0,
        totalSent: 0,
        totalDelivered: 0,
        totalOpens: 0,
        totalClicks: 0,
        totalBounces: 0,
        totalComplaints: 0,
        totalUnsubscribes: 0,
        averageOpenRate: 0,
        averageClickRate: 0,
      };
    }

    const totalSent = allAnalytics.reduce((sum, analytics) => sum + analytics.sentCount, 0);
    const totalDelivered = allAnalytics.reduce(
      (sum, analytics) => sum + analytics.deliveredCount,
      0,
    );
    const totalOpens = allAnalytics.reduce((sum, analytics) => sum + analytics.openCount, 0);
    const totalClicks = allAnalytics.reduce((sum, analytics) => sum + analytics.clickCount, 0);
    const totalBounces = allAnalytics.reduce((sum, analytics) => sum + analytics.bounceCount, 0);
    const totalComplaints = allAnalytics.reduce(
      (sum, analytics) => sum + analytics.complaintCount,
      0,
    );
    const totalUnsubscribes = allAnalytics.reduce(
      (sum, analytics) => sum + analytics.unsubscribeCount,
      0,
    );

    return {
      totalEmails: allAnalytics.length,
      totalSent,
      totalDelivered,
      totalOpens,
      totalClicks,
      totalBounces,
      totalComplaints,
      totalUnsubscribes,
      averageOpenRate: totalSent > 0 ? (totalOpens / totalSent) * 100 : 0,
      averageClickRate: totalDelivered > 0 ? (totalClicks / totalDelivered) * 100 : 0,
    };
  }

  async logEvent(emailQueueId: string, event: string, data?: Record<string, any>): Promise<void> {
    const analytics = await this.getOrCreateAnalytics(emailQueueId);

    analytics.eventLogs.push({
      event,
      timestamp: new Date(),
      data,
    });

    await this.emailAnalyticsRepository.save(analytics);
  }
}
