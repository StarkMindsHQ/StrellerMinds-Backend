import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SimplifiedDeprecationService } from './simplified-deprecation.service';

@Injectable()
export class SunsetEnforcementService {
  private readonly logger = new Logger(SunsetEnforcementService.name);

  constructor(
    private configService: ConfigService,
    private deprecationService: SimplifiedDeprecationService,
  ) {}

  /**
   * Check if any versions have reached their sunset date
   * This runs daily at midnight
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkSunsetDates(): Promise<void> {
    const deprecatedVersions = this.deprecationService.getAllDeprecatedVersions();
    const sunsetEnforcement = this.configService.get('api.sunsetEnforcement', { enabled: false });

    if (!sunsetEnforcement.enabled) {
      this.logger.log('Sunset enforcement is disabled');
      return;
    }

    const now = new Date();
    const pastSunsetVersions: string[] = [];
    const upcomingSunsetVersions: string[] = [];

    Object.entries(deprecatedVersions).forEach(([version, info]) => {
      const sunsetDate = new Date(info.sunsetDate);
      
      if (now >= sunsetDate) {
        pastSunsetVersions.push(version);
      } else {
        const daysUntilSunset = Math.ceil((sunsetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntilSunset <= 7) { // Within 7 days
          upcomingSunsetVersions.push(version);
        }
      }
    });

    // Log upcoming sunsets
    if (upcomingSunsetVersions.length > 0) {
      this.logger.warn(`Versions approaching sunset date: ${upcomingSunsetVersions.join(', ')}`);
      
      // Send notifications for upcoming sunsets
      await this.sendSunsetNotifications(upcomingSunsetVersions);
    }

    // Log past sunsets
    if (pastSunsetVersions.length > 0) {
      this.logger.error(`Versions past sunset date: ${pastSunsetVersions.join(', ')}`);
      
      // Send alerts for past sunsets
      await this.sendSunsetAlerts(pastSunsetVersions);
    }

    // Generate daily sunset report
    await this.generateSunsetReport();
  }

  /**
   * Send notifications for upcoming sunset dates
   */
  private async sendSunsetNotifications(versions: string[]): Promise<void> {
    for (const version of versions) {
      const deprecationInfo = this.deprecationService.getDeprecationInfo(version);
      if (!deprecationInfo) continue;

      const daysUntilSunset = this.deprecationService.getDaysUntilSunset(version);
      
      this.logger.warn(`SUNSET NOTIFICATION: Version ${version} will be removed in ${daysUntilSunset} days`, {
        version,
        sunsetDate: deprecationInfo.sunsetDate,
        daysUntilSunset,
        migrationGuide: deprecationInfo.migrationGuide,
      });

      // In a real implementation, you might:
      // - Send emails to API consumers
      // - Post to Slack/Discord
      // - Update status page
      // - Send push notifications
    }
  }

  /**
   * Send alerts for versions past sunset date
   */
  private async sendSunsetAlerts(versions: string[]): Promise<void> {
    for (const version of versions) {
      const deprecationInfo = this.deprecationService.getDeprecationInfo(version);
      if (!deprecationInfo) continue;

      this.logger.error(`SUNSET ALERT: Version ${version} is past sunset date and should be removed`, {
        version,
        sunsetDate: deprecationInfo.sunsetDate,
        migrationGuide: deprecationInfo.migrationGuide,
      });

      // In a real implementation, you might:
      // - Send critical alerts to operations team
      // - Create incident tickets
      // - Update monitoring dashboards
    }
  }

  /**
   * Generate daily sunset report
   */
  private async generateSunsetReport(): Promise<void> {
    const summary = this.deprecationService.getDeprecationSummary();
    
    this.logger.log('Daily Sunset Report', {
      totalDeprecatedVersions: summary.totalDeprecatedVersions,
      versionsInWarningPeriod: summary.versionsInWarningPeriod.length,
      versionsPastSunset: summary.versionsPastSunset.length,
      upcomingSunsets: summary.upcomingSunsets.length,
      nextSunset: summary.upcomingSunsets[0] || null,
    });

    // In a real implementation, you might:
    // - Send daily reports to stakeholders
    // - Update monitoring dashboards
    // - Store in analytics database
  }

  /**
   * Get sunset status for monitoring
   */
  getSunsetStatus(): {
    isEnabled: boolean;
    totalDeprecatedVersions: number;
    versionsInWarningPeriod: string[];
    versionsPastSunset: string[];
    upcomingSunsets: Array<{
      version: string;
      sunsetDate: string;
      daysUntilSunset: number;
    }>;
  } {
    const sunsetEnforcement = this.configService.get('api.sunsetEnforcement', { enabled: false });
    const summary = this.deprecationService.getDeprecationSummary();

    return {
      isEnabled: sunsetEnforcement.enabled,
      totalDeprecatedVersions: summary.totalDeprecatedVersions,
      versionsInWarningPeriod: summary.versionsInWarningPeriod,
      versionsPastSunset: summary.versionsPastSunset,
      upcomingSunsets: summary.upcomingSunsets,
    };
  }

  /**
   * Manually trigger sunset check (for testing or manual execution)
   */
  async manualSunsetCheck(): Promise<void> {
    this.logger.log('Manual sunset check triggered');
    await this.checkSunsetDates();
  }

  /**
   * Enable/disable sunset enforcement
   */
  toggleSunsetEnforcement(enabled: boolean): void {
    // In a real implementation, this might update configuration
    this.logger.log(`Sunset enforcement ${enabled ? 'enabled' : 'disabled'}`);
  }
}
