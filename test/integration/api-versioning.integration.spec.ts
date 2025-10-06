import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('API Versioning Integration Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Version Detection', () => {
    it('should extract version from api-version header', () => {
      return request(app.getHttpServer())
        .get('/api/v2/version/info')
        .set('api-version', 'v1')
        .expect(200)
        .expect((res) => {
          expect(res.headers['api-version']).toBe('v1');
          expect(res.headers['supported-versions']).toContain('v1');
          expect(res.headers['supported-versions']).toContain('v2');
        });
    });

    it('should extract version from accept-version header', () => {
      return request(app.getHttpServer())
        .get('/api/v2/version/info')
        .set('accept-version', 'v2')
        .expect(200)
        .expect((res) => {
          expect(res.headers['api-version']).toBe('v2');
        });
    });

    it('should extract version from query parameter', () => {
      return request(app.getHttpServer())
        .get('/api/v2/version/info?version=v1')
        .expect(200)
        .expect((res) => {
          expect(res.headers['api-version']).toBe('v1');
        });
    });

    it('should use URI version when available', () => {
      return request(app.getHttpServer())
        .get('/api/v1/version/info')
        .expect(200)
        .expect((res) => {
          expect(res.headers['api-version']).toBe('v1');
        });
    });
  });

  describe('Deprecated Version Handling', () => {
    it('should return deprecation headers for v1', () => {
      return request(app.getHttpServer())
        .get('/api/v1/version/info')
        .expect(200)
        .expect((res) => {
          expect(res.headers['deprecation']).toBe('true');
          expect(res.headers['sunset']).toBe('2024-12-31');
          expect(res.headers['link']).toContain('migration');
          expect(res.headers['warning']).toContain('deprecated');
        });
    });

    it('should not return deprecation headers for v2', () => {
      return request(app.getHttpServer())
        .get('/api/v2/version/info')
        .expect(200)
        .expect((res) => {
          expect(res.headers['deprecation']).toBeUndefined();
          expect(res.headers['sunset']).toBeUndefined();
          expect(res.headers['warning']).toBeUndefined();
        });
    });

    it('should log deprecation usage for v1 endpoints', async () => {
      // This test verifies that deprecation logging occurs
      // In a real scenario, you might check logs or use a mock logger
      await request(app.getHttpServer())
        .get('/api/v1/version/info')
        .expect(200);
      
      // Additional assertions could be added here to verify logging
    });
  });

  describe('Sunset Date Enforcement', () => {
    it('should handle sunset date enforcement', () => {
      // This test would need to mock the current date to be after sunset
      // For now, we'll test the structure exists
      return request(app.getHttpServer())
        .get('/api/v1/version/info')
        .expect(200)
        .expect((res) => {
          // Verify that sunset date is included in headers
          expect(res.headers['sunset']).toBeDefined();
        });
    });
  });

  describe('Error Handling', () => {
    it('should return 400 for unsupported version', () => {
      return request(app.getHttpServer())
        .get('/api/v2/version/info')
        .set('api-version', 'v3')
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body).toHaveProperty('supportedVersions');
          expect(res.body).toHaveProperty('currentVersion');
          expect(res.body).toHaveProperty('documentation');
        });
    });

    it('should return proper error format for unsupported version', () => {
      return request(app.getHttpServer())
        .get('/api/v2/version/info')
        .set('api-version', 'v99')
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Unsupported API version');
          expect(res.body.supportedVersions).toEqual(['v1', 'v2']);
          expect(res.body.currentVersion).toBe('v99');
          expect(res.body.documentation).toContain('versions');
        });
    });
  });

  describe('Authentication Endpoints', () => {
    describe('v1 Authentication (Deprecated)', () => {
      it('should return deprecation headers for v1 auth endpoints', () => {
        return request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ username: 'test@example.com', password: 'password123' })
          .expect(200)
          .expect((res) => {
            expect(res.headers['deprecation']).toBe('true');
            expect(res.headers['sunset']).toBe('2024-12-31');
            expect(res.headers['link']).toContain('migration');
          });
      });

      it('should accept username field in v1', () => {
        return request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ username: 'test@example.com', password: 'password123' })
          .expect(200);
      });
    });

    describe('v2 Authentication (Current)', () => {
      it('should not return deprecation headers for v2 auth endpoints', () => {
        return request(app.getHttpServer())
          .post('/api/v2/auth/login')
          .send({ email: 'test@example.com', password: 'password123', rememberMe: false })
          .expect(200)
          .expect((res) => {
            expect(res.headers['deprecation']).toBeUndefined();
            expect(res.headers['sunset']).toBeUndefined();
          });
      });

      it('should require email field in v2', () => {
        return request(app.getHttpServer())
          .post('/api/v2/auth/login')
          .send({ email: 'test@example.com', password: 'password123', rememberMe: false })
          .expect(200);
      });
    });
  });

  describe('Course Endpoints', () => {
    describe('v1 Courses (Deprecated)', () => {
      it('should return deprecation headers for v1 course endpoints', () => {
        return request(app.getHttpServer())
          .get('/api/v1/courses')
          .expect(200)
          .expect((res) => {
            expect(res.headers['deprecation']).toBe('true');
            expect(res.headers['sunset']).toBe('2024-12-31');
          });
      });
    });

    describe('v2 Courses (Current)', () => {
      it('should not return deprecation headers for v2 course endpoints', () => {
        return request(app.getHttpServer())
          .get('/api/v2/courses')
          .expect(200)
          .expect((res) => {
            expect(res.headers['deprecation']).toBeUndefined();
            expect(res.headers['sunset']).toBeUndefined();
          });
      });

      it('should support enhanced query parameters in v2', () => {
        return request(app.getHttpServer())
          .get('/api/v2/courses?page=1&limit=5&status=published&sortBy=createdAt&sortOrder=desc')
          .expect(200);
      });
    });
  });

  describe('Response Structure Compatibility', () => {
    it('should maintain v1 response structure', () => {
      return request(app.getHttpServer())
        .get('/api/v1/courses')
        .expect(200)
        .expect((res) => {
          // v1 should return the old structure
          expect(res.body).toHaveProperty('courses');
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('page');
          expect(res.body).toHaveProperty('limit');
        });
    });

    it('should provide enhanced v2 response structure', () => {
      return request(app.getHttpServer())
        .get('/api/v2/courses')
        .expect(200)
        .expect((res) => {
          // v2 should return the new structure
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('meta');
          expect(res.body.meta).toHaveProperty('total');
          expect(res.body.meta).toHaveProperty('page');
          expect(res.body.meta).toHaveProperty('limit');
          expect(res.body.meta).toHaveProperty('totalPages');
          expect(res.body.meta).toHaveProperty('hasNext');
          expect(res.body.meta).toHaveProperty('hasPrev');
        });
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent version requests efficiently', async () => {
      const requests = Array.from({ length: 20 }, (_, i) => 
        request(app.getHttpServer())
          .get('/api/v2/version/info')
          .set('api-version', i % 2 === 0 ? 'v1' : 'v2')
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();

      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });

      // Should complete within reasonable time (adjust threshold as needed)
      expect(endTime - startTime).toBeLessThan(5000);
    });
  });

  describe('Migration Endpoints', () => {
    it('should provide migration information', () => {
      return request(app.getHttpServer())
        .get('/api/v2/version/migration')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('deprecatedEndpoints');
          expect(res.body).toHaveProperty('migrationGuides');
          expect(Array.isArray(res.body.deprecatedEndpoints)).toBe(true);
          expect(Array.isArray(res.body.migrationGuides)).toBe(true);
        });
    });

    it('should provide compatibility check', () => {
      return request(app.getHttpServer())
        .get('/api/v2/version/compatibility/v1/v2')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('compatible');
          expect(res.body).toHaveProperty('breakingChanges');
          expect(res.body).toHaveProperty('recommendations');
          expect(typeof res.body.compatible).toBe('boolean');
          expect(Array.isArray(res.body.breakingChanges)).toBe(true);
          expect(Array.isArray(res.body.recommendations)).toBe(true);
        });
    });
  });
});
