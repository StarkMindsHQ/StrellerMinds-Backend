import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DatabaseOptimizationModule } from '../database-optimization.module';

describe('DatabaseOptimizationController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [DatabaseOptimizationModule.forRoot()],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/database-dashboard/performance-summary (GET)', () => {
    return request(app.getHttpServer()).get('/database-dashboard/performance-summary').expect(200);
  });

  it('/database-dashboard/slow-queries (GET)', () => {
    return request(app.getHttpServer()).get('/database-dashboard/slow-queries').expect(200);
  });

  it('/database-dashboard/connection-pool (GET)', () => {
    return request(app.getHttpServer()).get('/database-dashboard/connection-pool').expect(200);
  });

  it('/database-dashboard/cache-stats (GET)', () => {
    return request(app.getHttpServer()).get('/database-dashboard/cache-stats').expect(200);
  });

  afterEach(async () => {
    await app.close();
  });
});
