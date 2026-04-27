import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './app.module';

const THRESHOLD_MS = 500;

describe('API Response Time Thresholds', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const routes: Array<{ method: 'get' | 'post'; path: string; body?: object }> = [
    { method: 'get', path: '/' },
    { method: 'get', path: '/users' },
    { method: 'get', path: '/users/test-id' },
    { method: 'get', path: '/courses' },
    { method: 'get', path: '/courses/test-id' },
    { method: 'get', path: '/auth/profile' },
    { method: 'post', path: '/auth/login', body: { email: 'test@test.com', password: 'password' } },
  ];

  routes.forEach(({ method, path, body }) => {
    it(`${method.toUpperCase()} ${path} responds within ${THRESHOLD_MS}ms`, async () => {
      const start = Date.now();
      await request(app.getHttpServer())[method](path).send(body);
      expect(Date.now() - start).toBeLessThan(THRESHOLD_MS);
    });
  });
});
