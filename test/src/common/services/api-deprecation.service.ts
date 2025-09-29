import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiUsageLog } from '../entities/api-usage-log.entity';

export interface DeprecationSchedule {
  version: string;
  endpoint: string;
  method: string;
  deprecatedIn: string;
  removedIn: string;
  migrationGuide: string;
  alternative?: string;
  reason: string;
  impact: 'low' | 'medium' | 'high';
  notificationsSent: boolean;
  lastNotificationDate?: Date;
}

export interface DeprecationNotification {
  type: 'warning' | 'deprecation' | 'removal';
  version: string;
  endpoint: string;
  message: string;
  deadline: string;
  migrationGuide: string;
  alternative?: string;
}

@Injectable()
export class ApiDeprecationService {
  private readonly logger = new Logger(ApiDeprecationService.name);
  private deprecationSchedules: DeprecationSchedule[] = [];

  constructor(
    private configService: ConfigService,
    @InjectRepository(ApiUsageLog)
    private apiUsageRepository: Repository<ApiUsageLog>,
  ) {
    this.initializeDeprecationSchedules();
  }

  /**
   * Schedule an endpoint for deprecation
   */
  scheduleDeprecation(schedule: Omit<DeprecationSchedule, 'notificationsSent'>): void {
    const existingSchedule = this.deprecationSchedules.find(
      s => s.version === schedule.version && 
           s.endpoint === schedule.endpoint && 
           s.method === schedule.method
    );

    if (existingSchedule) {
      this.logger.warn(`Deprecation schedule already exists for ${schedule.method} ${schedule.endpoint} in ${schedule.version}`);
      return;
    }

    this.deprecationSchedules.push({
      ...schedule,
      notificationsSent: false,
    });

    this.logger.log(`Scheduled deprecation for ${schedule.method} ${schedule.endpoint} in ${schedule.version}`);
  }

  /**
   * Check if an endpoint is deprecated
   */
  isDeprecated(version: string, endpoint: string, method: string): boolean {
    return this.deprecationSchedules.some(
      schedule => schedule.version === version && 
                 schedule.endpoint === endpoint && 
                 schedule.method === method
    );
  }

  /**
   * Get deprecation information for an endpoint
   */
  getDeprecationInfo(version: string, endpoint: string, method: string): DeprecationSchedule | null {
    return this.deprecationSchedules.find(
      schedule => schedule.version === version && 
                 schedule.endpoint === endpoint && 
                 schedule.method === method
    ) || null;
  }

  /**
   * Get all deprecation schedules
   */
  getAllDeprecationSchedules(): DeprecationSchedule[] {
    return this.deprecationSchedules;
  }

  /**
   * Get upcoming deprecations
   */
  getUpcomingDeprecations(days: number = 30): DeprecationSchedule[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + days);

    return this.deprecationSchedules.filter(
      schedule => new Date(schedule.removedIn) <= cutoffDate
    );
  }

  /**
   * Get overdue deprecations (past removal date)
   */
  getOverdueDeprecations(): DeprecationSchedule[] {
    const now = new Date();
    return this.deprecationSchedules.filter(
      schedule => new Date(schedule.removedIn) < now
    );
  }

  /**
   * Generate deprecation notification
   */
  generateDeprecationNotification(schedule: DeprecationSchedule): DeprecationNotification {
    const daysUntilRemoval = Math.ceil(
      (new Date(schedule.removedIn).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );

    let type: 'warning' | 'deprecation' | 'removal';
    let message: string;

    if (daysUntilRemoval <= 0) {
      type = 'removal';
      message = `This endpoint has been removed as of ${schedule.removedIn}`;
    } else if (daysUntilRemoval <= 7) {
      type = 'deprecation';
      message = `This endpoint will be removed in ${daysUntilRemoval} days (${schedule.removedIn})`;
    } else {
      type = 'warning';
      message = `This endpoint is deprecated and will be removed on ${schedule.removedIn}`;
    }

    return {
      type,
      version: schedule.version,
      endpoint: schedule.endpoint,
      message,
      deadline: schedule.removedIn,
      migrationGuide: schedule.migrationGuide,
      alternative: schedule.alternative,
    };
  }

  /**
   * Send deprecation notifications
   */
  async sendDeprecationNotifications(): Promise<void> {
    const upcomingDeprecations = this.getUpcomingDeprecations(7); // Next 7 days
    const overdueDeprecations = this.getOverdueDeprecations();

    for (const schedule of [...upcomingDeprecations, ...overdueDeprecations]) {
      if (!schedule.notificationsSent) {
        await this.sendNotification(schedule);
        schedule.notificationsSent = true;
        schedule.lastNotificationDate = new Date();
      }
    }
  }

  /**
   * Get deprecation analytics
   */
  async getDeprecationAnalytics(): Promise<any> {
    const totalDeprecations = this.deprecationSchedules.length;
    const upcomingDeprecations = this.getUpcomingDeprecations(30);
    const overdueDeprecations = this.getOverdueDeprecations();

    // Get usage statistics for deprecated endpoints
    const deprecatedEndpoints = this.deprecationSchedules.map(s => ({
      endpoint: s.endpoint,
      version: s.version,
      method: s.method,
    }));

    const usageStats = await this.getDeprecatedEndpointUsage(deprecatedEndpoints);

    return {
      summary: {
        totalDeprecations,
        upcomingDeprecations: upcomingDeprecations.length,
        overdueDeprecations: overdueDeprecations.length,
        highImpactDeprecations: this.deprecationSchedules.filter(s => s.impact === 'high').length,
        mediumImpactDeprecations: this.deprecationSchedules.filter(s => s.impact === 'medium').length,
        lowImpactDeprecations: this.deprecationSchedules.filter(s => s.impact === 'low').length,
      },
      usageStats,
      deprecationTimeline: this.generateDeprecationTimeline(),
    };
  }

  /**
   * Generate deprecation timeline
   */
  generateDeprecationTimeline(): any[] {
    const timeline = [];
    const now = new Date();

    for (const schedule of this.deprecationSchedules) {
      const deprecationDate = new Date(schedule.deprecatedIn);
      const removalDate = new Date(schedule.removedIn);

      timeline.push({
        version: schedule.version,
        endpoint: schedule.endpoint,
        method: schedule.method,
        deprecationDate: schedule.deprecatedIn,
        removalDate: schedule.removedIn,
        status: now < deprecationDate ? 'scheduled' : 
                now >= deprecationDate && now < removalDate ? 'deprecated' : 'removed',
        impact: schedule.impact,
        daysUntilRemoval: Math.ceil((removalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      });
    }

    return timeline.sort((a, b) => new Date(a.removalDate).getTime() - new Date(b.removalDate).getTime());
  }

  /**
   * Generate deprecation report
   */
  generateDeprecationReport(): any {
    const analytics = this.getDeprecationAnalytics();
    const timeline = this.generateDeprecationTimeline();

    return {
      summary: {
        totalDeprecations: this.deprecationSchedules.length,
        activeDeprecations: this.deprecationSchedules.filter(s => 
          new Date(s.deprecatedIn) <= new Date() && new Date(s.removedIn) > new Date()
        ).length,
        completedRemovals: this.deprecationSchedules.filter(s => 
          new Date(s.removedIn) <= new Date()
        ).length,
      },
      timeline,
      recommendations: this.generateDeprecationRecommendations(),
      migrationGuides: this.deprecationSchedules.map(s => ({
        from: s.version,
        endpoint: s.endpoint,
        guide: s.migrationGuide,
        alternative: s.alternative,
        reason: s.reason,
      })),
    };
  }

  private async sendNotification(schedule: DeprecationSchedule): Promise<void> {
    const notification = this.generateDeprecationNotification(schedule);
    
    // Log the notification
    this.logger.warn(`Deprecation notification sent: ${notification.message}`, {
      version: notification.version,
      endpoint: notification.endpoint,
      type: notification.type,
      deadline: notification.deadline,
    });

    // In a real implementation, you would send actual notifications
    // via email, webhook, or other channels
    await this.sendEmailNotification(notification);
    await this.sendWebhookNotification(notification);
  }

  private async sendEmailNotification(notification: DeprecationNotification): Promise<void> {
    // Mock email notification
    this.logger.debug(`Email notification would be sent: ${notification.message}`);
  }

  private async sendWebhookNotification(notification: DeprecationNotification): Promise<void> {
    // Mock webhook notification
    this.logger.debug(`Webhook notification would be sent: ${notification.message}`);
  }

  private async getDeprecatedEndpointUsage(deprecatedEndpoints: any[]): Promise<any[]> {
    const usageStats = [];

    for (const endpoint of deprecatedEndpoints) {
      const usage = await this.apiUsageRepository
        .createQueryBuilder('log')
        .select('COUNT(*)', 'usage_count')
        .where('log.endpoint = :endpoint', { endpoint: `${endpoint.method} ${endpoint.endpoint}` })
        .andWhere('log.version = :version', { version: endpoint.version })
        .andWhere('log.deprecated = :deprecated', { deprecated: true })
        .getRawOne();

      usageStats.push({
        endpoint: endpoint.endpoint,
        version: endpoint.version,
        method: endpoint.method,
        usageCount: parseInt(usage?.usage_count || '0'),
      });
    }

    return usageStats;
  }

  private generateDeprecationRecommendations(): string[] {
    const recommendations: string[] = [];
    const overdueDeprecations = this.getOverdueDeprecations();
    const upcomingDeprecations = this.getUpcomingDeprecations(7);

    if (overdueDeprecations.length > 0) {
      recommendations.push('Remove overdue deprecated endpoints immediately');
      recommendations.push('Update client applications to use new endpoints');
    }

    if (upcomingDeprecations.length > 0) {
      recommendations.push('Send final notifications to API consumers');
      recommendations.push('Prepare for endpoint removal');
    }

    const highImpactDeprecations = this.deprecationSchedules.filter(s => s.impact === 'high');
    if (highImpactDeprecations.length > 0) {
      recommendations.push('High-impact deprecations detected - plan carefully');
      recommendations.push('Provide comprehensive migration support');
    }

    return recommendations;
  }

  private initializeDeprecationSchedules(): void {
    this.deprecationSchedules = [
      {
        version: 'v1',
        endpoint: '/auth/login',
        method: 'POST',
        deprecatedIn: '2024-01-01',
        removedIn: '2024-12-31',
        migrationGuide: 'https://docs.strellerminds.com/api/migration/v1-to-v2#authentication',
        alternative: '/api/v2/auth/login',
        reason: 'Enhanced authentication with improved security',
        impact: 'medium',
        notificationsSent: false,
      },
      {
        version: 'v1',
        endpoint: '/courses',
        method: 'GET',
        deprecatedIn: '2024-01-01',
        removedIn: '2024-12-31',
        migrationGuide: 'https://docs.strellerminds.com/api/migration/v1-to-v2#courses',
        alternative: '/api/v2/courses',
        reason: 'Improved course filtering and pagination',
        impact: 'low',
        notificationsSent: false,
      },
      {
        version: 'v1',
        endpoint: '/users/profile',
        method: 'PUT',
        deprecatedIn: '2024-01-01',
        removedIn: '2024-12-31',
        migrationGuide: 'https://docs.strellerminds.com/api/migration/v1-to-v2#users',
        alternative: '/api/v2/users/profile',
        reason: 'Enhanced profile management with additional fields',
        impact: 'high',
        notificationsSent: false,
      },
    ];
  }
} 