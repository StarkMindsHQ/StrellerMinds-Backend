import { Injectable } from '@nestjs/common';

/**
 * Representation of an API Version
 */
export interface APIVersion {
  id: string; // e.g., 'v1', 'v1.1'
  major: number;
  minor: number;
  patch: number;
  status: 'beta' | 'stable' | 'deprecated' | 'retired';
  releaseDate: Date;
  sunsetDate?: Date; // When the version will be retired
  changelogUrl?: string; // Link to documentation/changelog
  supportedUntil?: Date; // Support window
}

/**
 * Migration Strategy interface
 */
export interface MigrationStrategy {
  sourceVersion: string;
  targetVersion: string;
  transform: (data: any) => any; // Function to transform request body/payload
}

/**
 * API Versioning Statistics
 */
export interface VersionAnalytics {
  versionId: string;
  requestCount: number;
  errorRate: number;
  activeUsers: number;
  latencyAvg: number;
}
