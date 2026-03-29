import { Injectable, Logger } from '@nestjs/common';
import { APIVersion, VersionAnalytics } from '../models/APIVersion';

/**
 * Version Manager Service
 * Manages the lifecycle of API versions and handles version selection logic
 */
@Injectable()
export class VersionManager {
  private readonly logger = new Logger(VersionManager.name);
  private versions: Map<string, APIVersion> = new Map();
  private analytics: Map<string, VersionAnalytics> = new Map();

  constructor() {
    // Register initial stable version
    this.registerVersion({
      id: 'v1.0',
      major: 1,
      minor: 0,
      patch: 0,
      status: 'stable',
      releaseDate: new Date('2025-01-01'),
    });
  }

  /**
   * Register a new API version
   */
  registerVersion(version: APIVersion): void {
    this.versions.set(version.id, version);
    if (!this.analytics.has(version.id)) {
      this.analytics.set(version.id, {
        versionId: version.id,
        requestCount: 0,
        errorRate: 0,
        activeUsers: 0,
        latencyAvg: 0,
      });
    }
  }

  /**
   * Get version info
   */
  getVersion(versionId: string): APIVersion | undefined {
    return this.versions.get(versionId);
  }

  /**
   * Get all registered versions
   */
  getVersions(): APIVersion[] {
    return Array.from(this.versions.values());
  }

  /**
   * Check if a version is supported
   */
  isSupported(versionId: string): boolean {
    const version = this.versions.get(versionId);
    return version ? version.status !== 'retired' : false;
  }

  /**
   * Track metrics for a specific version
   */
  trackUsage(versionId: string, latencyMs: number, success: boolean): void {
    const stats = this.analytics.get(versionId);
    if (stats) {
      stats.requestCount++;
      // Simple rolling average for latency
      stats.latencyAvg = (stats.latencyAvg * (stats.requestCount - 1) + latencyMs) / stats.requestCount;
      if (!success) {
        // Increment error count (simple ratio)
        stats.errorRate = (stats.errorRate * (stats.requestCount - 1) + 1) / stats.requestCount;
      }
    }
  }

  /**
   * Get analytics for all versions
   */
  getAnalytics(): VersionAnalytics[] {
    return Array.from(this.analytics.values());
  }

  /**
   * Get the current recommended version
   */
  getRecommendedVersion(): APIVersion {
    const stableVersions = this.getVersions().filter(v => v.status === 'stable');
    return stableVersions.sort((a, b) => b.major - a.major || b.minor - a.minor)[0];
  }
}
