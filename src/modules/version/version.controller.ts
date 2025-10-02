import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { VersionAnalyticsService } from '../../common/services/version-analytics.service';
import { ApiVersioningService } from '../../common/services/api-versioning.service';
import { ConfigService } from '@nestjs/config';

@ApiTags('API Version Management')
@Controller('version')
export class VersionController {
  constructor(
    private versionAnalytics: VersionAnalyticsService,
    private apiVersioningService: ApiVersioningService,
    private configService: ConfigService,
  ) {}

  @Get('info')
  @ApiOperation({
    summary: 'Get API version information',
    description: 'Returns current API version, supported versions, and deprecation status',
  })
  @ApiResponse({
    status: 200,
    description: 'Version information retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        current: { type: 'string', example: 'v2' },
        supported: { type: 'array', items: { type: 'string' }, example: ['v1', 'v2'] },
        deprecated: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              version: { type: 'string', example: 'v1' },
              deprecatedIn: { type: 'string', example: '2024-01-01' },
              removedIn: { type: 'string', example: '2024-12-31' },
              migrationGuide: {
                type: 'string',
                example: 'https://docs.strellerminds.com/api/migration/v1-to-v2',
              },
              alternative: { type: 'string', example: 'v2' },
              reason: { type: 'string', example: 'Enhanced features and improved performance' },
            },
          },
        },
        documentation: {
          type: 'object',
          properties: {
            versions: {
              type: 'object',
              additionalProperties: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'current' },
                  deprecatedIn: { type: 'string', example: '2024-01-01' },
                  removedIn: { type: 'string', example: '2024-12-31' },
                  features: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
      },
    },
  })
  async getVersionInfo() {
    return this.apiVersioningService.getVersionInfo();
  }

  @Get('analytics')
  @ApiOperation({
    summary: 'Get version usage analytics',
    description: 'Returns detailed analytics about API version usage and deprecated endpoint usage',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Number of days to analyze (default: 30)',
    type: Number,
    example: 30,
  })
  @ApiResponse({
    status: 200,
    description: 'Analytics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        versionUsage: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              version: { type: 'string', example: 'v2' },
              totalUsage: { type: 'number', example: 1500 },
              deprecatedUsage: { type: 'number', example: 0 },
              percentage: { type: 'number', example: 75.5 },
            },
          },
        },
        deprecatedEndpoints: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              endpoint: { type: 'string', example: 'GET /api/v1/courses' },
              version: { type: 'string', example: 'v1' },
              usage_count: { type: 'number', example: 25 },
            },
          },
        },
      },
    },
  })
  async getAnalytics(@Query('days') days: number = 30) {
    const [usageStats, deprecatedUsage] = await Promise.all([
      this.apiVersioningService.getVersionUsageStats(days),
      this.apiVersioningService.getDeprecatedEndpointUsage(),
    ]);

    return {
      versionUsage: usageStats,
      deprecatedEndpoints: deprecatedUsage,
    };
  }

  @Get('migration')
  @ApiOperation({
    summary: 'Get migration recommendations',
    description: 'Returns migration guides and recommendations for deprecated versions',
  })
  @ApiResponse({
    status: 200,
    description: 'Migration recommendations retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        deprecatedEndpoints: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              endpoint: { type: 'string', example: 'GET /api/v1/courses' },
              version: { type: 'string', example: 'v1' },
              usage_count: { type: 'number', example: 25 },
            },
          },
        },
        migrationGuides: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              from: { type: 'string', example: 'v1' },
              to: { type: 'string', example: 'v2' },
              guide: {
                type: 'string',
                example: 'https://docs.strellerminds.com/api/migration/v1-to-v2',
              },
              deadline: { type: 'string', example: '2024-12-31' },
              usageCount: { type: 'number', example: 150 },
            },
          },
        },
      },
    },
  })
  async getMigrationRecommendations() {
    return this.apiVersioningService.getMigrationRecommendations();
  }

  @Get('compatibility/:oldVersion/:newVersion')
  @ApiOperation({
    summary: 'Check backward compatibility',
    description: 'Validates backward compatibility between two API versions',
  })
  @ApiParam({ name: 'oldVersion', description: 'Old API version', example: 'v1' })
  @ApiParam({ name: 'newVersion', description: 'New API version', example: 'v2' })
  @ApiResponse({
    status: 200,
    description: 'Compatibility check completed',
    schema: {
      type: 'object',
      properties: {
        compatible: { type: 'boolean', example: true },
        breakingChanges: {
          type: 'array',
          items: { type: 'string' },
          example: ['Authentication endpoint changed', 'Response format modified'],
        },
        recommendations: {
          type: 'array',
          items: { type: 'string' },
          example: ['Test thoroughly before upgrading', 'Review migration guide'],
        },
      },
    },
  })
  async checkCompatibility(
    @Param('oldVersion') oldVersion: string,
    @Param('newVersion') newVersion: string,
  ) {
    return this.apiVersioningService.validateBackwardCompatibility(oldVersion, newVersion);
  }

  @Get('documentation/:version')
  @ApiOperation({
    summary: 'Get versioned API documentation',
    description: 'Returns API documentation for a specific version',
  })
  @ApiParam({ name: 'version', description: 'API version', example: 'v2' })
  @ApiResponse({
    status: 200,
    description: 'Versioned documentation retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        version: { type: 'string', example: 'v2' },
        status: { type: 'string', example: 'current' },
        deprecatedIn: { type: 'string', example: null },
        removedIn: { type: 'string', example: null },
        features: {
          type: 'array',
          items: { type: 'string' },
          example: ['Enhanced authentication', 'Improved course management'],
        },
        endpoints: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              path: { type: 'string', example: '/api/v2/auth/login' },
              method: { type: 'string', example: 'POST' },
              description: { type: 'string', example: 'User authentication' },
              deprecated: { type: 'boolean', example: false },
            },
          },
        },
        examples: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string', example: 'Authentication' },
              description: { type: 'string', example: 'Example for v2 authentication' },
              request: { type: 'object' },
              response: { type: 'object' },
            },
          },
        },
      },
    },
  })
  async getVersionedDocumentation(@Param('version') version: string) {
    return this.apiVersioningService.generateVersionedDocumentation(version);
  }

  @Get('status')
  @ApiOperation({
    summary: 'Get API version status',
    description: 'Returns current status of all API versions',
  })
  @ApiResponse({
    status: 200,
    description: 'Version status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        currentVersion: { type: 'string', example: 'v2' },
        supportedVersions: {
          type: 'array',
          items: { type: 'string' },
          example: ['v1', 'v2'],
        },
        deprecatedVersions: {
          type: 'array',
          items: { type: 'string' },
          example: ['v1'],
        },
        nextDeprecation: {
          type: 'object',
          properties: {
            version: { type: 'string', example: 'v1' },
            removedIn: { type: 'string', example: '2024-12-31' },
            daysRemaining: { type: 'number', example: 180 },
          },
        },
      },
    },
  })
  async getVersionStatus() {
    const versionInfo = this.apiVersioningService.getVersionInfo();
    const deprecatedVersions = versionInfo.deprecated.map((d: any) => d.version);

    // Calculate next deprecation
    const nextDeprecation = versionInfo.deprecated
      .filter((d: any) => new Date(d.removedIn) > new Date())
      .sort(
        (a: any, b: any) => new Date(a.removedIn).getTime() - new Date(b.removedIn).getTime(),
      )[0];

    const daysRemaining = nextDeprecation
      ? Math.ceil(
          (new Date(nextDeprecation.removedIn).getTime() - new Date().getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : null;

    return {
      currentVersion: versionInfo.current,
      supportedVersions: versionInfo.supported,
      deprecatedVersions,
      nextDeprecation: nextDeprecation
        ? {
            version: nextDeprecation.version,
            removedIn: nextDeprecation.removedIn,
            daysRemaining,
          }
        : null,
    };
  }
}
