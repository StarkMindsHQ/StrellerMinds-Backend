import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';

describe('Error Handling (e2e)', () => {
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

  describe('Error Response Format', () => {
    it('should return standardized error response for 404', () => {
      return request(app.getHttpServer())
        .get('/non-existent-endpoint')
        .expect(404)
        .expect((res) => {
          const body = res.body;
          expect(body).toHaveProperty('errorCode');
          expect(body).toHaveProperty('statusCode');
          expect(body).toHaveProperty('message');
          expect(body).toHaveProperty('timestamp');
          expect(body).toHaveProperty('path');
          expect(body).toHaveProperty('correlationId');
        });
    });

    it('should include correlation ID in response headers', () => {
      return request(app.getHttpServer())
        .get('/non-existent-endpoint')
        .expect(404)
        .expect((res) => {
          expect(res.headers).toHaveProperty('x-correlation-id');
          expect(res.headers['x-correlation-id']).toBeDefined();
        });
    });

    it('should preserve provided correlation ID', () => {
      const correlationId = 'test-correlation-id';
      return request(app.getHttpServer())
        .get('/non-existent-endpoint')
        .set('x-correlation-id', correlationId)
        .expect(404)
        .expect((res) => {
          expect(res.headers['x-correlation-id']).toBe(correlationId);
        });
    });
  });

  describe('Error Dashboard API', () => {
    it('should return error summary', () => {
      return request(app.getHttpServer())
        .get('/error-dashboard/summary')
        .expect(200)
        .expect((res) => {
          const body = res.body;
          expect(body).toHaveProperty('totalErrors');
          expect(body).toHaveProperty('errorRate');
          expect(body).toHaveProperty('criticalErrors');
          expect(body).toHaveProperty('topErrorTypes');
          expect(body).toHaveProperty('timeRange');
        });
    });

    it('should return error trends', () => {
      return request(app.getHttpServer())
        .get('/error-dashboard/trends')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('should return top errors', () => {
      return request(app.getHttpServer())
        .get('/error-dashboard/top-errors')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('should return alert history', () => {
      return request(app.getHttpServer())
        .get('/error-dashboard/alert-history')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });
});
