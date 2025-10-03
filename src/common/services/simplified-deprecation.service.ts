import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface DeprecationInfo {
  version: string;
  deprecatedIn: string;
  sunsetDate: string;
  migrationGuide: string;
  alternative: string;
  reason: string;
  endpoints: Array<{
    path: string;
    method: string;
    breakingChange: string;
  }>;
}

export interface DeprecationWarning {
  message: string;
  version: string;
  sunsetDate: string;
  migrationGuide: string;
  alternative: string;
  daysUntilSunset: number;
}

@Injectable()
export class SimplifiedDeprecationService {
  private readonly logger = new Logger(SimplifiedDeprecationService.name);

  constructor(private configService: ConfigService) {}

  /**
   * Get deprecation information for a version
   */
  getDeprecationInfo(version: string): DeprecationInfo | null {
    const deprecatedVersions = this.configService.get('api.deprecatedVersions', {});
    return deprecatedVersions[version] || null;
  }

  /**
   * Check if a version is deprecated
   */
  isDeprecated(version: string): boolean {
    return !!this.getDeprecationInfo(version);
  }

  /**
   * Check if a version is past its sunset date
   */
  isPastSunset(version: string): boolean {
    const deprecationInfo = this.getDeprecationInfo(version);
    if (!deprecationInfo) return false;

    const sunsetDate = new Date(deprecationInfo.sunsetDate);
    const now = new Date();
    
    return now > sunsetDate;
  }

  /**
   * Check if we're in the warning period (90 days before sunset)
   */
  isInWarningPeriod(version: string): boolean {
    const deprecationInfo = this.getDeprecationInfo(version);
    if (!deprecationInfo) return false;

    const sunsetDate = new Date(deprecationInfo.sunsetDate);
    const warningPeriod = this.configService.get('api.sunsetEnforcement.warningPeriodDays', 90);
    const warningStartDate = new Date(sunsetDate);
    warningStartDate.setDate(warningStartDate.getDate() - warningPeriod);
    
    const now = new Date();
    return now >= warningStartDate && now < sunsetDate;
  }

  /**
   * Get days until sunset
   */
  getDaysUntilSunset(version: string): number {
    const deprecationInfo = this.getDeprecationInfo(version);
    if (!deprecationInfo) return -1;

    const sunsetDate = new Date(deprecationInfo.sunsetDate);
    const now = new Date();
    const diffTime = sunsetDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  }

  /**
   * Generate deprecation warning
   */
  generateWarning(version: string): DeprecationWarning | null {
    const deprecationInfo = this.getDeprecationInfo(version);
    if (!deprecationInfo) return null;

    const daysUntilSunset = this.getDaysUntilSunset(version);
    
    let message = `API version ${version} is deprecated and will be removed on ${deprecationInfo.sunsetDate}`;
    
    if (daysUntilSunset <= 30) {
      message += `. Only ${daysUntilSunset} days remaining!`;
    } else if (daysUntilSunset <= 90) {
      message += `. ${daysUntilSunset} days remaining. Please migrate soon.`;
    }

    return {
      message,
      version,
      sunsetDate: deprecationInfo.sunsetDate,
      migrationGuide: deprecationInfo.migrationGuide,
      alternative: deprecationInfo.alternative,
      daysUntilSunset
    };
  }

  /**
   * Log deprecation usage
   */
  logDeprecationUsage(version: string, endpoint: string, userAgent?: string): void {
    const deprecationInfo = this.getDeprecationInfo(version);
    if (!deprecationInfo) return;

    const daysUntilSunset = this.getDaysUntilSunset(version);
    const isInWarningPeriod = this.isInWarningPeriod(version);
    
    const logData = {
      version,
      endpoint,
      userAgent,
      daysUntilSunset,
      isInWarningPeriod,
      migrationGuide: deprecationInfo.migrationGuide
    };

    if (daysUntilSunset <= 30) {
      this.logger.error(`CRITICAL: Deprecated API usage - ${version} endpoint ${endpoint}`, logData);
    } else if (isInWarningPeriod) {
      this.logger.warn(`Deprecated API usage - ${version} endpoint ${endpoint}`, logData);
    } else {
      this.logger.log(`Deprecated API usage - ${version} endpoint ${endpoint}`, logData);
    }
  }

  /**
   * Get all deprecated versions
   */
  getAllDeprecatedVersions(): Record<string, DeprecationInfo> {
    return this.configService.get('api.deprecatedVersions', {});
  }

  /**
   * Get deprecation summary
   */
  getDeprecationSummary(): {
    totalDeprecatedVersions: number;
    versionsInWarningPeriod: string[];
    versionsPastSunset: string[];
    upcomingSunsets: Array<{
      version: string;
      sunsetDate: string;
      daysUntilSunset: number;
    }>;
  } {
    const deprecatedVersions = this.getAllDeprecatedVersions();
    const versionsInWarningPeriod: string[] = [];
    const versionsPastSunset: string[] = [];
    const upcomingSunsets: Array<{
      version: string;
      sunsetDate: string;
      daysUntilSunset: number;
    }> = [];

    Object.keys(deprecatedVersions).forEach(version => {
      if (this.isInWarningPeriod(version)) {
        versionsInWarningPeriod.push(version);
      }
      
      if (this.isPastSunset(version)) {
        versionsPastSunset.push(version);
      }
      
      const daysUntilSunset = this.getDaysUntilSunset(version);
      if (daysUntilSunset > 0) {
        upcomingSunsets.push({
          version,
          sunsetDate: deprecatedVersions[version].sunsetDate,
          daysUntilSunset
        });
      }
    });

    // Sort upcoming sunsets by days until sunset
    upcomingSunsets.sort((a, b) => a.daysUntilSunset - b.daysUntilSunset);

    return {
      totalDeprecatedVersions: Object.keys(deprecatedVersions).length,
      versionsInWarningPeriod,
      versionsPastSunset,
      upcomingSunsets
    };
  }
}
