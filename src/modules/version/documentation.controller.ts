import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ApiDocumentationService } from '../../common/services/api-documentation.service';

@ApiTags('API Documentation')
@Controller('documentation')
export class DocumentationController {
  constructor(private apiDocumentationService: ApiDocumentationService) {}

  @Get('versions')
  @ApiOperation({
    summary: 'Get all available documentation versions',
    description: 'Returns list of all available API documentation versions',
  })
  @ApiResponse({
    status: 200,
    description: 'Available versions retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        versions: {
          type: 'array',
          items: { type: 'string' },
          example: ['v1', 'v2'],
        },
        currentVersion: { type: 'string', example: 'v2' },
        deprecatedVersions: {
          type: 'array',
          items: { type: 'string' },
          example: ['v1'],
        },
      },
    },
  })
  async getAvailableVersions() {
    const versions = this.apiDocumentationService.getAllVersions();
    return {
      versions,
      currentVersion: 'v2',
      deprecatedVersions: ['v1'],
    };
  }

  @Get(':version')
  @ApiOperation({
    summary: 'Get documentation for specific version',
    description: 'Returns complete API documentation for the specified version',
  })
  @ApiParam({ name: 'version', description: 'API version', example: 'v2' })
  @ApiResponse({
    status: 200,
    description: 'Documentation retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        version: { type: 'string', example: 'v2' },
        title: { type: 'string', example: 'StrellerMinds API v2' },
        description: { type: 'string' },
        baseUrl: { type: 'string', example: 'https://api.strellerminds.com/v2' },
        endpoints: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              path: { type: 'string', example: '/auth/login' },
              method: { type: 'string', example: 'POST' },
              summary: { type: 'string' },
              deprecated: { type: 'boolean' },
            },
          },
        },
      },
    },
  })
  async getDocumentation(@Param('version') version: string) {
    const doc = this.apiDocumentationService.getDocumentation(version);
    if (!doc) {
      throw new Error(`Documentation not found for version ${version}`);
    }
    return doc;
  }

  @Get(':version/openapi')
  @ApiOperation({
    summary: 'Get OpenAPI specification for version',
    description: 'Returns OpenAPI 3.0 specification for the specified version',
  })
  @ApiParam({ name: 'version', description: 'API version', example: 'v2' })
  @ApiResponse({
    status: 200,
    description: 'OpenAPI specification retrieved successfully',
  })
  async getOpenAPISpec(@Param('version') version: string) {
    return this.apiDocumentationService.generateOpenAPISpec(version);
  }

  @Get(':version/changelog')
  @ApiOperation({
    summary: 'Get changelog for version',
    description: 'Returns changelog entries for the specified version',
  })
  @ApiParam({ name: 'version', description: 'API version', example: 'v2' })
  @ApiResponse({
    status: 200,
    description: 'Changelog retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          version: { type: 'string', example: 'v2.0.0' },
          date: { type: 'string', example: '2024-01-01' },
          type: { type: 'string', example: 'added' },
          description: { type: 'string' },
          breaking: { type: 'boolean' },
        },
      },
    },
  })
  async getChangelog(@Param('version') version: string) {
    return this.apiDocumentationService.getChangelog(version);
  }

  @Get('migration/:fromVersion/:toVersion')
  @ApiOperation({
    summary: 'Get migration guide between versions',
    description: 'Returns migration guide for upgrading from one version to another',
  })
  @ApiParam({ name: 'fromVersion', description: 'Source version', example: 'v1' })
  @ApiParam({ name: 'toVersion', description: 'Target version', example: 'v2' })
  @ApiResponse({
    status: 200,
    description: 'Migration guide retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        fromVersion: { type: 'string', example: 'v1' },
        toVersion: { type: 'string', example: 'v2' },
        title: { type: 'string' },
        description: { type: 'string' },
        breakingChanges: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              endpoint: { type: 'string' },
              method: { type: 'string' },
              change: { type: 'string' },
              impact: { type: 'string' },
              migration: { type: 'string' },
            },
          },
        },
        migrationSteps: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              step: { type: 'number' },
              title: { type: 'string' },
              description: { type: 'string' },
              code: { type: 'string' },
            },
          },
        },
      },
    },
  })
  async getMigrationGuide(
    @Param('fromVersion') fromVersion: string,
    @Param('toVersion') toVersion: string,
  ) {
    const guide = this.apiDocumentationService.getMigrationGuide(fromVersion, toVersion);
    if (!guide) {
      throw new Error(`Migration guide not found from ${fromVersion} to ${toVersion}`);
    }
    return guide;
  }

  @Get('report')
  @ApiOperation({
    summary: 'Generate documentation report',
    description: 'Returns comprehensive report of all documentation versions',
  })
  @ApiResponse({
    status: 200,
    description: 'Documentation report generated successfully',
    schema: {
      type: 'object',
      properties: {
        summary: {
          type: 'object',
          properties: {
            totalVersions: { type: 'number' },
            currentVersion: { type: 'string' },
            deprecatedVersions: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
        versions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              version: { type: 'string' },
              title: { type: 'string' },
              endpoints: { type: 'number' },
              deprecatedEndpoints: { type: 'number' },
              schemas: { type: 'number' },
              examples: { type: 'number' },
              migrationGuides: { type: 'number' },
            },
          },
        },
        recommendations: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  })
  async generateDocumentationReport() {
    return this.apiDocumentationService.generateDocumentationReport();
  }

  @Get('compare/:version1/:version2')
  @ApiOperation({
    summary: 'Compare two API versions',
    description: 'Returns detailed comparison between two API versions',
  })
  @ApiParam({ name: 'version1', description: 'First version to compare', example: 'v1' })
  @ApiParam({ name: 'version2', description: 'Second version to compare', example: 'v2' })
  @ApiResponse({
    status: 200,
    description: 'Version comparison completed successfully',
    schema: {
      type: 'object',
      properties: {
        version1: { type: 'string', example: 'v1' },
        version2: { type: 'string', example: 'v2' },
        comparison: {
          type: 'object',
          properties: {
            addedEndpoints: {
              type: 'array',
              items: { type: 'string' },
            },
            removedEndpoints: {
              type: 'array',
              items: { type: 'string' },
            },
            changedEndpoints: {
              type: 'array',
              items: { type: 'string' },
            },
            breakingChanges: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
      },
    },
  })
  async compareVersions(@Param('version1') version1: string, @Param('version2') version2: string) {
    const doc1 = this.apiDocumentationService.getDocumentation(version1);
    const doc2 = this.apiDocumentationService.getDocumentation(version2);

    if (!doc1 || !doc2) {
      throw new Error(`Documentation not found for one or both versions`);
    }

    const endpoints1 = new Set(doc1.endpoints.map((e) => `${e.method} ${e.path}`));
    const endpoints2 = new Set(doc2.endpoints.map((e) => `${e.method} ${e.path}`));

    const addedEndpoints = Array.from(endpoints2).filter((e) => !endpoints1.has(e));
    const removedEndpoints = Array.from(endpoints1).filter((e) => !endpoints2.has(e));
    const commonEndpoints = Array.from(endpoints1).filter((e) => endpoints2.has(e));

    // Find changed endpoints (simplified comparison)
    const changedEndpoints = commonEndpoints.filter((endpoint) => {
      const [method, path] = endpoint.split(' ');
      const ep1 = doc1.endpoints.find((e) => e.method === method && e.path === path);
      const ep2 = doc2.endpoints.find((e) => e.method === method && e.path === path);

      return (
        ep1 &&
        ep2 &&
        (ep1.deprecated !== ep2.deprecated ||
          JSON.stringify(ep1.parameters) !== JSON.stringify(ep2.parameters))
      );
    });

    return {
      version1,
      version2,
      comparison: {
        addedEndpoints,
        removedEndpoints,
        changedEndpoints,
        breakingChanges: removedEndpoints, // Simplified: removed endpoints are breaking changes
      },
    };
  }
}
