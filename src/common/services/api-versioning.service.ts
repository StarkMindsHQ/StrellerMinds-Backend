import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiUsageLog } from '../entities/api-usage-log.entity';

export interface VersionInfo {
  version: string;
  status: 'current' | 'deprecated' | 'removed';
  deprecatedIn?: string;
  removedIn?: string;
  migrationGuide?: string;
  alternative?: string;
  features?: string[];
}

export interface DeprecationInfo {
  version: string;
  deprecatedIn: string;
  removedIn: string;
  migrationGuide: string;
  alternative: string;
  reason: string;
  usageCount: number;
}

@Injectable()
export class ApiVersioningService {
  private readonly logger = new Logger(ApiVersioningService.name);

  constructor(
    private configService: ConfigService,
    @InjectRepository(ApiUsageLog)
    private apiUsageRepository: Repository<ApiUsageLog>,
  ) {}

  /**
   * Get current API version information
   */
  getVersionInfo(): {
    current: string;
    supported: string[];
    deprecated: DeprecationInfo[];
    documentation: any;
  } {
    const config = this.configService.get('api');

    return {
      current: config.defaultVersion,
      supported: config.supportedVersions,
      deprecated: config.deprecatedVersions,
      documentation: config.documentation,
    };
  }

  /**
   * Check if a version is supported
   */
  isVersionSupported(version: string): boolean {
    const supportedVersions = this.configService.get<string[]>('api.supportedVersions', []);
    return supportedVersions.includes(version);
  }

  /**
   * Check if a version is deprecated
   */
  isVersionDeprecated(version: string): boolean {
    const deprecatedVersions = this.configService.get<string[]>('api.deprecatedVersions', []);
    return deprecatedVersions.includes(version);
  }

  /**
   * Get deprecation information for a version
   */
  getDeprecationInfo(version: string): DeprecationInfo | null {
    const deprecatedVersions = this.configService.get('api.deprecatedVersions', []);
    return deprecatedVersions.find((v: any) => v.version === version) || null;
  }

  /**
   * Track API usage for analytics
   */
  async trackUsage(data: {
    version: string;
    endpoint: string;
    method: string;
    userAgent?: string;
    ip?: string;
    deprecated: boolean;
  }): Promise<void> {
    try {
      const log = this.apiUsageRepository.create({
        version: data.version,
        endpoint: `${data.method} ${data.endpoint}`,
        userAgent: data.userAgent,
        deprecated: data.deprecated,
        timestamp: new Date(),
      });

      await this.apiUsageRepository.save(log);
    } catch (error) {
      this.logger.error('Failed to track API usage', error);
    }
  }

  /**
   * Get version usage statistics
   */
  async getVersionUsageStats(days: number = 30): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await this.apiUsageRepository
      .createQueryBuilder('log')
      .select([
        'log.version',
        'COUNT(*) as usage_count',
        'COUNT(CASE WHEN log.deprecated = true THEN 1 END) as deprecated_usage_count',
      ])
      .where('log.timestamp >= :startDate', { startDate })
      .groupBy('log.version')
      .orderBy('usage_count', 'DESC')
      .getRawMany();

    return stats.map((stat: any) => ({
      version: stat.log_version,
      totalUsage: parseInt(stat.usage_count),
      deprecatedUsage: parseInt(stat.deprecated_usage_count),
      percentage: 0, // Will be calculated
    }));
  }

  /**
   * Get deprecated endpoint usage
   */
  async getDeprecatedEndpointUsage(): Promise<any> {
    return this.apiUsageRepository
      .createQueryBuilder('log')
      .select(['log.endpoint', 'log.version', 'COUNT(*) as usage_count'])
      .where('log.deprecated = :deprecated', { deprecated: true })
      .groupBy('log.endpoint, log.version')
      .orderBy('usage_count', 'DESC')
      .getRawMany();
  }

  /**
   * Get migration recommendations
   */
  async getMigrationRecommendations(): Promise<any> {
    const deprecatedUsage = await this.getDeprecatedEndpointUsage();
    const versionInfo = this.getVersionInfo();

    return {
      deprecatedEndpoints: deprecatedUsage,
      migrationGuides: versionInfo.deprecated.map((dep: any) => ({
        from: dep.version,
        to: dep.alternative,
        guide: dep.migrationGuide,
        deadline: dep.removedIn,
        usageCount: deprecatedUsage
          .filter((u: any) => u.log_version === dep.version)
          .reduce((sum: number, u: any) => sum + parseInt(u.usage_count), 0),
      })),
    };
  }

  /**
   * Validate backward compatibility
   */
  validateBackwardCompatibility(
    oldVersion: string,
    newVersion: string,
  ): {
    compatible: boolean;
    breakingChanges: string[];
    recommendations: string[];
  } {
    // This would contain logic to validate backward compatibility
    // For now, returning a mock implementation
    return {
      compatible: true,
      breakingChanges: [],
      recommendations: [
        'Test thoroughly before upgrading',
        'Review migration guide',
        'Update client libraries',
      ],
    };
  }

  /**
   * Generate API documentation for a specific version
   */
  generateVersionedDocumentation(version: string): any {
    const config = this.configService.get('api');
    const versionConfig = config.documentation.versions[version];

    if (!versionConfig) {
      throw new Error(`Version ${version} not found in documentation`);
    }

    return {
      version,
      status: versionConfig.status,
      deprecatedIn: versionConfig.deprecatedIn,
      removedIn: versionConfig.removedIn,
      features: versionConfig.features || [],
      endpoints: this.getVersionedEndpoints(version),
      examples: this.getVersionedExamples(version),
    };
  }

  /**
   * Get versioned endpoints (mock implementation)
   */
  private getVersionedEndpoints(version: string): any[] {
    // This would return actual endpoint definitions for the version
    return [
      {
        path: `/api/${version}/auth/login`,
        method: 'POST',
        description: 'User authentication',
        deprecated: version === 'v1',
      },
      {
        path: `/api/${version}/courses`,
        method: 'GET',
        description: 'List courses',
        deprecated: version === 'v1',
      },
    ];
  }

  /**
   * Get versioned examples (mock implementation)
   */
  private getVersionedExamples(version: string): any[] {
    return [
      {
        title: 'Authentication',
        description: `Example for ${version} authentication`,
        request: {
          method: 'POST',
          url: `/api/${version}/auth/login`,
          body: {
            email: 'user@example.com',
            password: 'password123',
          },
        },
        response: {
          status: 200,
          body: {
            accessToken: 'jwt_token_here',
            refreshToken: 'refresh_token_here',
          },
        },
      },
    ];
  }
}
