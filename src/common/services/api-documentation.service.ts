import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ApiDocumentation {
  version: string;
  title: string;
  description: string;
  baseUrl: string;
  endpoints: ApiEndpoint[];
  schemas: ApiSchema[];
  examples: ApiExample[];
  changelog: ChangelogEntry[];
  migrationGuides: MigrationGuide[];
}

export interface ApiEndpoint {
  path: string;
  method: string;
  summary: string;
  description: string;
  deprecated: boolean;
  deprecatedIn?: string;
  removedIn?: string;
  parameters: ApiParameter[];
  requestBody?: ApiRequestBody;
  responses: ApiResponse[];
  tags: string[];
}

export interface ApiParameter {
  name: string;
  in: 'path' | 'query' | 'header';
  required: boolean;
  type: string;
  description: string;
  example?: any;
}

export interface ApiRequestBody {
  required: boolean;
  content: {
    [key: string]: {
      schema: any;
      example?: any;
    };
  };
}

export interface ApiResponse {
  code: string;
  description: string;
  content?: {
    [key: string]: {
      schema: any;
      example?: any;
    };
  };
}

export interface ApiSchema {
  name: string;
  type: string;
  properties: any;
  required?: string[];
  example?: any;
}

export interface ApiExample {
  title: string;
  description: string;
  request: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: any;
  };
  response: {
    status: number;
    headers?: Record<string, string>;
    body?: any;
  };
}

export interface ChangelogEntry {
  version: string;
  date: string;
  type: 'added' | 'changed' | 'deprecated' | 'removed' | 'fixed' | 'security';
  description: string;
  breaking?: boolean;
}

export interface MigrationGuide {
  fromVersion: string;
  toVersion: string;
  title: string;
  description: string;
  breakingChanges: BreakingChange[];
  migrationSteps: MigrationStep[];
  examples: MigrationExample[];
}

export interface BreakingChange {
  endpoint: string;
  method: string;
  change: string;
  impact: 'low' | 'medium' | 'high';
  migration: string;
}

export interface MigrationStep {
  step: number;
  title: string;
  description: string;
  code?: string;
}

export interface MigrationExample {
  title: string;
  before: string;
  after: string;
  description: string;
}

@Injectable()
export class ApiDocumentationService {
  private readonly logger = new Logger(ApiDocumentationService.name);
  private documentation: Map<string, ApiDocumentation> = new Map();

  constructor(private configService: ConfigService) {
    this.initializeDocumentation();
  }

  /**
   * Get documentation for a specific version
   */
  getDocumentation(version: string): ApiDocumentation | null {
    return this.documentation.get(version) || null;
  }

  /**
   * Get all available documentation versions
   */
  getAllVersions(): string[] {
    return Array.from(this.documentation.keys());
  }

  /**
   * Generate OpenAPI specification for a version
   */
  generateOpenAPISpec(version: string): any {
    const doc = this.getDocumentation(version);
    if (!doc) {
      throw new Error(`Documentation not found for version ${version}`);
    }

    return {
      openapi: '3.0.0',
      info: {
        title: doc.title,
        description: doc.description,
        version: doc.version,
      },
      servers: [
        {
          url: doc.baseUrl,
          description: `${doc.version} API server`,
        },
      ],
      paths: this.generatePaths(doc.endpoints),
      components: {
        schemas: this.generateSchemas(doc.schemas),
      },
      tags: this.generateTags(doc.endpoints),
    };
  }

  /**
   * Get migration guide between versions
   */
  getMigrationGuide(fromVersion: string, toVersion: string): MigrationGuide | null {
    const doc = this.getDocumentation(toVersion);
    if (!doc) return null;

    const migrationGuide = doc.migrationGuides.find(
      (guide) => guide.fromVersion === fromVersion && guide.toVersion === toVersion,
    );

    return migrationGuide || null;
  }

  /**
   * Get changelog for a version
   */
  getChangelog(version: string): ChangelogEntry[] {
    const doc = this.getDocumentation(version);
    return doc?.changelog || [];
  }

  /**
   * Generate comprehensive documentation report
   */
  generateDocumentationReport(): any {
    const versions = this.getAllVersions();
    const reports = versions.map((version) => {
      const doc = this.getDocumentation(version);
      return {
        version,
        title: doc?.title,
        endpoints: doc?.endpoints.length || 0,
        deprecatedEndpoints: doc?.endpoints.filter((e) => e.deprecated).length || 0,
        schemas: doc?.schemas.length || 0,
        examples: doc?.examples.length || 0,
        migrationGuides: doc?.migrationGuides.length || 0,
      };
    });

    return {
      summary: {
        totalVersions: versions.length,
        currentVersion: this.configService.get('api.defaultVersion'),
        deprecatedVersions: versions.filter((v) => this.isVersionDeprecated(v)),
      },
      versions: reports,
      recommendations: this.generateDocumentationRecommendations(),
    };
  }

  /**
   * Check if a version is deprecated
   */
  private isVersionDeprecated(version: string): boolean {
    const deprecatedVersions = this.configService.get<string[]>('api.deprecatedVersions', []);
    return deprecatedVersions.includes(version);
  }

  /**
   * Generate paths object for OpenAPI spec
   */
  private generatePaths(endpoints: ApiEndpoint[]): any {
    const paths: any = {};

    for (const endpoint of endpoints) {
      if (!paths[endpoint.path]) {
        paths[endpoint.path] = {};
      }

      paths[endpoint.path][endpoint.method.toLowerCase()] = {
        summary: endpoint.summary,
        description: endpoint.description,
        deprecated: endpoint.deprecated,
        tags: endpoint.tags,
        parameters: endpoint.parameters.map((p) => ({
          name: p.name,
          in: p.in,
          required: p.required,
          schema: { type: p.type },
          description: p.description,
          example: p.example,
        })),
        requestBody: endpoint.requestBody
          ? {
              required: endpoint.requestBody.required,
              content: endpoint.requestBody.content,
            }
          : undefined,
        responses: Object.fromEntries(
          endpoint.responses.map((r) => [
            r.code,
            {
              description: r.description,
              content: r.content,
            },
          ]),
        ),
      };
    }

    return paths;
  }

  /**
   * Generate schemas object for OpenAPI spec
   */
  private generateSchemas(schemas: ApiSchema[]): any {
    const schemasObj: any = {};

    for (const schema of schemas) {
      schemasObj[schema.name] = {
        type: schema.type,
        properties: schema.properties,
        required: schema.required,
        example: schema.example,
      };
    }

    return schemasObj;
  }

  /**
   * Generate tags for OpenAPI spec
   */
  private generateTags(endpoints: ApiEndpoint[]): any[] {
    const tagSet = new Set<string>();

    for (const endpoint of endpoints) {
      for (const tag of endpoint.tags) {
        tagSet.add(tag);
      }
    }

    return Array.from(tagSet).map((tag) => ({ name: tag }));
  }

  /**
   * Generate documentation recommendations
   */
  private generateDocumentationRecommendations(): string[] {
    const recommendations: string[] = [];
    const versions = this.getAllVersions();

    // Check for missing migration guides
    for (let i = 0; i < versions.length - 1; i++) {
      const fromVersion = versions[i];
      const toVersion = versions[i + 1];
      const migrationGuide = this.getMigrationGuide(fromVersion, toVersion);

      if (!migrationGuide) {
        recommendations.push(`Missing migration guide from ${fromVersion} to ${toVersion}`);
      }
    }

    // Check for deprecated endpoints without alternatives
    for (const version of versions) {
      const doc = this.getDocumentation(version);
      if (doc) {
        const deprecatedEndpoints = doc.endpoints.filter((e) => e.deprecated);
        for (const endpoint of deprecatedEndpoints) {
          if (
            !endpoint.description.includes('alternative') &&
            !endpoint.description.includes('replacement')
          ) {
            recommendations.push(
              `Deprecated endpoint ${endpoint.method} ${endpoint.path} in ${version} needs alternative endpoint`,
            );
          }
        }
      }
    }

    return recommendations;
  }

  /**
   * Initialize documentation for all versions
   */
  private initializeDocumentation(): void {
    // Initialize v1 documentation
    this.documentation.set('v1', {
      version: 'v1',
      title: 'StrellerMinds API v1',
      description: 'Deprecated API version - use v2 for new integrations',
      baseUrl: 'https://api.strellerminds.com/v1',
      endpoints: [
        {
          path: '/auth/login',
          method: 'POST',
          summary: 'User authentication (deprecated)',
          description:
            'Authenticate user with username and password. This endpoint is deprecated, use v2 for enhanced security.',
          deprecated: true,
          deprecatedIn: '2024-01-01',
          removedIn: '2024-12-31',
          parameters: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    username: { type: 'string' },
                    password: { type: 'string' },
                  },
                  required: ['username', 'password'],
                },
                example: {
                  username: 'user@example.com',
                  password: 'password123',
                },
              },
            },
          },
          responses: [
            {
              code: '200',
              description: 'Authentication successful',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      accessToken: { type: 'string' },
                      refreshToken: { type: 'string' },
                      user: { $ref: '#/components/schemas/User' },
                    },
                  },
                },
              },
            },
          ],
          tags: ['Authentication'],
        },
        {
          path: '/courses',
          method: 'GET',
          summary: 'List courses (deprecated)',
          description:
            'Get list of courses with basic filtering. This endpoint is deprecated, use v2 for enhanced filtering.',
          deprecated: true,
          deprecatedIn: '2024-01-01',
          removedIn: '2024-12-31',
          parameters: [
            {
              name: 'category',
              in: 'query',
              required: false,
              type: 'string',
              description: 'Filter by category',
            },
          ],
          responses: [
            {
              code: '200',
              description: 'List of courses',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      courses: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Course' },
                      },
                    },
                  },
                },
              },
            },
          ],
          tags: ['Courses'],
        },
      ],
      schemas: [
        {
          name: 'User',
          type: 'object',
          properties: {
            id: { type: 'string' },
            username: { type: 'string' },
            email: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
          },
          required: ['id', 'username', 'email'],
        },
        {
          name: 'Course',
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
            price: { type: 'number' },
          },
          required: ['id', 'title'],
        },
      ],
      examples: [
        {
          title: 'Authentication',
          description: 'Example of user authentication',
          request: {
            method: 'POST',
            url: '/auth/login',
            headers: { 'Content-Type': 'application/json' },
            body: {
              username: 'user@example.com',
              password: 'password123',
            },
          },
          response: {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
            body: {
              accessToken: 'jwt_token_here',
              refreshToken: 'refresh_token_here',
              user: {
                id: 'user-123',
                username: 'user@example.com',
                email: 'user@example.com',
                firstName: 'John',
                lastName: 'Doe',
              },
            },
          },
        },
      ],
      changelog: [
        {
          version: 'v1.0.0',
          date: '2023-01-01',
          type: 'added',
          description: 'Initial API release',
        },
        {
          version: 'v1.1.0',
          date: '2023-06-01',
          type: 'added',
          description: 'Added course management endpoints',
        },
        {
          version: 'v1.2.0',
          date: '2024-01-01',
          type: 'deprecated',
          description: 'API version deprecated in favor of v2',
          breaking: false,
        },
      ],
      migrationGuides: [
        {
          fromVersion: 'v1',
          toVersion: 'v2',
          title: 'Migration from v1 to v2',
          description: 'Complete guide for migrating from API v1 to v2',
          breakingChanges: [
            {
              endpoint: '/auth/login',
              method: 'POST',
              change: 'Username field renamed to email',
              impact: 'medium',
              migration: 'Replace username field with email in login requests',
            },
            {
              endpoint: '/courses',
              method: 'GET',
              change: 'Category parameter changed to categories array',
              impact: 'low',
              migration: 'Use categories array instead of single category parameter',
            },
          ],
          migrationSteps: [
            {
              step: 1,
              title: 'Update authentication',
              description: 'Replace username field with email in login requests',
              code: `// Before
{
  "username": "user@example.com",
  "password": "password123"
}

// After
{
  "email": "user@example.com",
  "password": "password123"
}`,
            },
            {
              step: 2,
              title: 'Update course filtering',
              description: 'Use categories array for course filtering',
              code: `// Before
GET /courses?category=blockchain

// After
GET /courses?categories=blockchain`,
            },
          ],
          examples: [
            {
              title: 'Authentication Migration',
              description: 'Example of migrating authentication requests',
              before: `POST /v1/auth/login
{
  "username": "user@example.com",
  "password": "password123"
}`,
              after: `POST /v2/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}`,
            },
          ],
        },
      ],
    });

    // Initialize v2 documentation
    this.documentation.set('v2', {
      version: 'v2',
      title: 'StrellerMinds API v2',
      description: 'Current API version with enhanced features and improved security',
      baseUrl: 'https://api.strellerminds.com/v2',
      endpoints: [
        {
          path: '/auth/login',
          method: 'POST',
          summary: 'Enhanced user authentication',
          description:
            'Authenticate user with email and password. Enhanced security with rate limiting and improved error handling.',
          deprecated: false,
          parameters: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 8 },
                  },
                  required: ['email', 'password'],
                },
                example: {
                  email: 'user@example.com',
                  password: 'password123',
                },
              },
            },
          },
          responses: [
            {
              code: '200',
              description: 'Authentication successful',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      accessToken: { type: 'string' },
                      refreshToken: { type: 'string' },
                      user: { $ref: '#/components/schemas/UserV2' },
                      expiresIn: { type: 'number' },
                    },
                  },
                },
              },
            },
          ],
          tags: ['Authentication'],
        },
        {
          path: '/courses',
          method: 'GET',
          summary: 'Enhanced course listing',
          description:
            'Get list of courses with advanced filtering, pagination, and sorting options.',
          deprecated: false,
          parameters: [
            {
              name: 'categories',
              in: 'query',
              required: false,
              type: 'array',
              description: 'Filter by categories (comma-separated)',
            },
            {
              name: 'page',
              in: 'query',
              required: false,
              type: 'integer',
              description: 'Page number for pagination',
            },
            {
              name: 'limit',
              in: 'query',
              required: false,
              type: 'integer',
              description: 'Number of items per page',
            },
          ],
          responses: [
            {
              code: '200',
              description: 'List of courses with pagination',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      courses: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/CourseV2' },
                      },
                      pagination: { $ref: '#/components/schemas/Pagination' },
                    },
                  },
                },
              },
            },
          ],
          tags: ['Courses'],
        },
      ],
      schemas: [
        {
          name: 'UserV2',
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            profile: { $ref: '#/components/schemas/UserProfile' },
          },
          required: ['id', 'email'],
        },
        {
          name: 'CourseV2',
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            categories: { type: 'array', items: { type: 'string' } },
            price: { type: 'number' },
            instructor: { $ref: '#/components/schemas/Instructor' },
          },
          required: ['id', 'title'],
        },
        {
          name: 'Pagination',
          type: 'object',
          properties: {
            page: { type: 'integer' },
            limit: { type: 'integer' },
            total: { type: 'integer' },
            pages: { type: 'integer' },
          },
        },
      ],
      examples: [
        {
          title: 'Enhanced Authentication',
          description: 'Example of enhanced user authentication',
          request: {
            method: 'POST',
            url: '/auth/login',
            headers: { 'Content-Type': 'application/json' },
            body: {
              email: 'user@example.com',
              password: 'password123',
            },
          },
          response: {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
            body: {
              accessToken: 'jwt_token_here',
              refreshToken: 'refresh_token_here',
              expiresIn: 3600,
              user: {
                id: 'user-123',
                email: 'user@example.com',
                firstName: 'John',
                lastName: 'Doe',
                profile: {
                  avatar: 'https://example.com/avatar.jpg',
                  bio: 'Software developer',
                },
              },
            },
          },
        },
      ],
      changelog: [
        {
          version: 'v2.0.0',
          date: '2024-01-01',
          type: 'added',
          description: 'Initial v2 API release with enhanced features',
        },
        {
          version: 'v2.1.0',
          date: '2024-03-01',
          type: 'added',
          description: 'Added advanced course filtering and pagination',
        },
      ],
      migrationGuides: [],
    });
  }
}
