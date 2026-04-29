/**
 * Swagger/OpenAPI Documentation Tests
 * 
 * Validates that:
 * 1. Swagger UI is accessible and returns HTML
 * 2. OpenAPI JSON endpoint returns valid OpenAPI document
 * 3. Generated OpenAPI JSON file is valid
 * 4. All registered routes are documented
 * 5. No unresolved $ref references exist
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import { AppModule } from '../src/app.module';

describe('Swagger/OpenAPI Documentation (Issue #771)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply global pipes and middleware (matching main.ts)
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
        skipMissingProperties: false,
        errorHttpStatusCode: 400,
      }),
    );

    // Setup Swagger (matching main.ts configuration)
    const config = new DocumentBuilder()
      .setTitle('StrellerMinds Backend API')
      .setDescription(
        'Comprehensive API for StrellerMinds - a blockchain education platform built on the Stellar network.',
      )
      .setVersion('0.0.1')
      .setContact(
        'StarkMindsHQ',
        'https://github.com/StarkMindsHQ/StrellerMinds-Backend',
        'contact@strellerminds.com',
      )
      .setLicense('UNLICENSED', '')
      .addServer('http://localhost:3000', 'Development server')
      .addServer('https://api.strellerminds.com', 'Production server')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'bearerAuth',
      )
      .addTag('Health', 'Health check and system status endpoints')
      .addTag('Authentication', 'User authentication, registration, and token management')
      .addTag('MFA', 'Multi-factor authentication setup and verification')
      .addTag('Users', 'User management and profile operations')
      .addTag('Courses', 'Course management and enrollment')
      .addTag('Database', 'Database connection pool monitoring and metrics')
      .addTag('GDPR', 'GDPR compliance - data export and deletion')
      .addTag('Contract Testing', 'Contract testing and OpenAPI validation')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        displayOperationId: false,
        filter: true,
        showRequestHeaders: true,
        docExpansion: 'list',
      },
    });

    // Serve OpenAPI JSON
    app.getHttpAdapter().get('/api/docs-json', (req, res) => {
      res.json(document);
    });

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Swagger UI Availability', () => {
    it('should serve Swagger UI at /api/docs', async () => {
      const response = await request(app.getHttpServer()).get('/api/docs');

      expect(response.status).toBe(200);
      expect(response.type).toContain('text/html');
      expect(response.text).toContain('swagger-ui');
    });

    it('should serve OpenAPI JSON at /api/docs-json', async () => {
      const response = await request(app.getHttpServer()).get('/api/docs-json');

      expect(response.status).toBe(200);
      expect(response.type).toContain('application/json');
      expect(response.body).toHaveProperty('openapi');
      expect(response.body).toHaveProperty('info');
      expect(response.body).toHaveProperty('paths');
    });
  });

  describe('OpenAPI Document Validation', () => {
    let openApiDocument: any;

    beforeAll(async () => {
      const response = await request(app.getHttpServer()).get('/api/docs-json');
      openApiDocument = response.body;
    });

    it('should have valid OpenAPI structure', () => {
      expect(openApiDocument.openapi).toBe('3.0.3');
      expect(openApiDocument.info).toBeDefined();
      expect(openApiDocument.info.title).toBe('StrellerMinds Backend API');
      expect(openApiDocument.info.version).toBe('0.0.1');
      expect(openApiDocument.paths).toBeDefined();
      expect(typeof openApiDocument.paths).toBe('object');
    });

    it('should have required info fields', () => {
      const info = openApiDocument.info;
      expect(info.title).toBeDefined();
      expect(info.version).toBeDefined();
      expect(info.description).toBeDefined();
      expect(info.contact).toBeDefined();
      expect(info.contact.name).toBe('StarkMindsHQ');
    });

    it('should have servers defined', () => {
      expect(openApiDocument.servers).toBeDefined();
      expect(Array.isArray(openApiDocument.servers)).toBe(true);
      expect(openApiDocument.servers.length).toBeGreaterThan(0);

      const devServer = openApiDocument.servers.find(
        (s: any) => s.url === 'http://localhost:3000',
      );
      expect(devServer).toBeDefined();
    });

    it('should have tags defined', () => {
      expect(openApiDocument.tags).toBeDefined();
      expect(Array.isArray(openApiDocument.tags)).toBe(true);

      const expectedTags = [
        'Health',
        'Authentication',
        'MFA',
        'Users',
        'Courses',
        'Database',
        'GDPR',
        'Contract Testing',
      ];

      const tagNames = openApiDocument.tags.map((t: any) => t.name);
      expectedTags.forEach((tag) => {
        expect(tagNames).toContain(tag);
      });
    });

    it('should have security schemes defined', () => {
      expect(openApiDocument.components).toBeDefined();
      expect(openApiDocument.components.securitySchemes).toBeDefined();
      expect(openApiDocument.components.securitySchemes.bearerAuth).toBeDefined();

      const bearerAuth = openApiDocument.components.securitySchemes.bearerAuth;
      expect(bearerAuth.type).toBe('http');
      expect(bearerAuth.scheme).toBe('bearer');
      expect(bearerAuth.bearerFormat).toBe('JWT');
    });

    it('should have at least one path defined', () => {
      const paths = Object.keys(openApiDocument.paths);
      expect(paths.length).toBeGreaterThan(0);
    });

    it('should not have unresolved $ref references', () => {
      const refRegex = /""\$ref""\s*:\s*"#\/components\/schemas\/(\w+)"/g;
      const documentStr = JSON.stringify(openApiDocument);
      const refs = new Set<string>();

      let match;
      const refPattern = /""\$ref""\s*:\s*"#\/components\/schemas\/(\w+)"/g;
      while ((match = refPattern.exec(documentStr)) !== null) {
        refs.add(match[1]);
      }

      const schemas = openApiDocument.components?.schemas || {};
      const unresolvedRefs: string[] = [];

      refs.forEach((ref) => {
        if (!schemas[ref]) {
          unresolvedRefs.push(ref);
        }
      });

      expect(unresolvedRefs).toEqual([]);
    });
  });

  describe('Static OpenAPI Export', () => {
    it('should have generated openapi.json file', () => {
      const openApiPath = path.join(__dirname, '..', 'docs', 'openapi.json');
      expect(fs.existsSync(openApiPath)).toBe(true);
    });

    it('should have valid JSON in openapi.json', () => {
      const openApiPath = path.join(__dirname, '..', 'docs', 'openapi.json');
      const content = fs.readFileSync(openApiPath, 'utf8');

      expect(() => JSON.parse(content)).not.toThrow();
    });

    it('should have required OpenAPI fields in static export', () => {
      const openApiPath = path.join(__dirname, '..', 'docs', 'openapi.json');
      const content = fs.readFileSync(openApiPath, 'utf8');
      const doc = JSON.parse(content);

      expect(doc.openapi).toBeDefined();
      expect(doc.info).toBeDefined();
      expect(doc.info.title).toBeDefined();
      expect(doc.paths).toBeDefined();
    });
  });

  describe('Endpoint Documentation', () => {
    let openApiDocument: any;

    beforeAll(async () => {
      const response = await request(app.getHttpServer()).get('/api/docs-json');
      openApiDocument = response.body;
    });

    it('should document root health check endpoint', () => {
      expect(openApiDocument.paths['/']).toBeDefined();
      expect(openApiDocument.paths['/'].get).toBeDefined();

      const endpoint = openApiDocument.paths['/'].get;
      expect(endpoint.tags).toContain('Health');
      expect(endpoint.summary).toBeDefined();
      expect(endpoint.description).toBeDefined();
      expect(endpoint.responses).toBeDefined();
      expect(endpoint.responses['200']).toBeDefined();
    });

    it('should document authentication endpoints', () => {
      const authPaths = Object.keys(openApiDocument.paths).filter((p) =>
        p.startsWith('/auth'),
      );

      expect(authPaths.length).toBeGreaterThan(0);

      authPaths.forEach((path) => {
        const pathItem = openApiDocument.paths[path];
        const methods = Object.keys(pathItem).filter((m) =>
          ['get', 'post', 'put', 'delete', 'patch'].includes(m),
        );

        methods.forEach((method) => {
          const endpoint = pathItem[method];
          expect(endpoint.tags).toBeDefined();
          expect(endpoint.summary).toBeDefined();
          expect(endpoint.responses).toBeDefined();
        });
      });
    });

    it('should have proper response documentation', () => {
      const paths = openApiDocument.paths;

      Object.keys(paths).forEach((pathKey) => {
        const pathItem = paths[pathKey];
        const methods = Object.keys(pathItem).filter((m) =>
          ['get', 'post', 'put', 'delete', 'patch'].includes(m),
        );

        methods.forEach((method) => {
          const endpoint = pathItem[method];
          expect(endpoint.responses).toBeDefined();
          expect(Object.keys(endpoint.responses).length).toBeGreaterThan(0);

          // Check that responses have descriptions
          Object.keys(endpoint.responses).forEach((statusCode) => {
            const response = endpoint.responses[statusCode];
            expect(response.description).toBeDefined();
          });
        });
      });
    });
  });

  describe('Documentation Completeness', () => {
    let openApiDocument: any;

    beforeAll(async () => {
      const response = await request(app.getHttpServer()).get('/api/docs-json');
      openApiDocument = response.body;
    });

    it('should document at least 30 endpoints', () => {
      const paths = Object.keys(openApiDocument.paths);
      let endpointCount = 0;

      paths.forEach((path) => {
        const pathItem = openApiDocument.paths[path];
        const methods = Object.keys(pathItem).filter((m) =>
          ['get', 'post', 'put', 'delete', 'patch'].includes(m),
        );
        endpointCount += methods.length;
      });

      expect(endpointCount).toBeGreaterThanOrEqual(30);
    });

    it('should have all major resource tags', () => {
      const tagNames = openApiDocument.tags.map((t: any) => t.name);

      const requiredTags = [
        'Health',
        'Authentication',
        'Users',
        'Courses',
        'Database',
        'GDPR',
      ];

      requiredTags.forEach((tag) => {
        expect(tagNames).toContain(tag);
      });
    });

    it('should have endpoints for each tag', () => {
      const tagNames = openApiDocument.tags.map((t: any) => t.name);
      const paths = openApiDocument.paths;

      tagNames.forEach((tag) => {
        let hasEndpointWithTag = false;

        Object.keys(paths).forEach((pathKey) => {
          const pathItem = paths[pathKey];
          const methods = Object.keys(pathItem).filter((m) =>
            ['get', 'post', 'put', 'delete', 'patch'].includes(m),
          );

          methods.forEach((method) => {
            const endpoint = pathItem[method];
            if (endpoint.tags && endpoint.tags.includes(tag)) {
              hasEndpointWithTag = true;
            }
          });
        });

        expect(hasEndpointWithTag).toBe(true);
      });
    });
  });
});
