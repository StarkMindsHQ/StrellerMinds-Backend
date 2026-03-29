import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { VersionManager } from './VersionManager';
import { APIVersion } from '../models/APIVersion';

/**
 * Deprecation Handler Service
 * Manages deprecation schedules, sunset warnings, and deprecation headers
 */
@Injectable()
export class DeprecationHandler {
  private readonly logger = new Logger(DeprecationHandler.name);
  private deprecationSchedules: Map<string, Date> = new Map();

  constructor(private readonly versionManager: VersionManager) {}

  /**
   * Register a version for deprecation
   */
  registerDeprecation(versionId: string, sunsetDate: Date): void {
    const version = this.versionManager.getVersion(versionId);
    if (!version) {
      this.logger.error(`[Deprecation Handler] Version ${versionId} not found`);
      return;
    }

    version.status = 'deprecated';
    version.sunsetDate = sunsetDate;
    this.deprecationSchedules.set(versionId, sunsetDate);

    this.logger.warn(`[Deprecation Handler] Version ${versionId} marked as deprecated. Sunset date set: ${sunsetDate.toISOString()}`);
  }

  /**
   * Check if a version is nearing its sunset date
   */
  isNearSunset(versionId: string, thresholdDays: number = 30): boolean {
    const sunsetDate = this.deprecationSchedules.get(versionId);
    if (!sunsetDate) return false;

    const daysLeft = (sunsetDate.getTime() - Date.now()) / (1000 * 3600 * 24);
    return daysLeft <= thresholdDays;
  }

  /**
   * Handle the specific request to a version that is deprecated
   */
  handleDeprecatedRequest(versionId: string): void {
    const version = this.versionManager.getVersion(versionId);
    if (!version) return;

    if (version.status === 'retired') {
      throw new BadRequestException(`Version ${versionId} is retired. Please upgrade to ${this.versionManager.getRecommendedVersion().id}`);
    }

    if (version.status === 'deprecated') {
      this.logger.warn(`[Deprecation Handler] Request received for deprecated version: ${versionId}`);
    }
  }

  /**
   * Get deprecation headers for a version
   */
  getDeprecationHeaders(versionId: string): Record<string, string> {
    const version = this.versionManager.getVersion(versionId);
    const headers: Record<string, string> = {};

    if (version?.status === 'deprecated') {
      headers['Deprecation'] = 'true';
      if (version.sunsetDate) {
        headers['Sunset'] = version.sunsetDate.toUTCString();
      }
      headers['Link'] = `<${this.versionManager.getRecommendedVersion().changelogUrl || '#'}>; rel="alternate"`;
    }

    return headers;
  }

  /**
   * Checks if an upgrade is required for security or stability reasons
   */
  isUpgradeRequired(versionId: string): boolean {
    const version = this.versionManager.getVersion(versionId);
    return version?.status === 'retired';
  }
}
