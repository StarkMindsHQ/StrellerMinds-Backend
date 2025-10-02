import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './../src/app.module';

import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import compress from '@fastify/compress';
import request from 'supertest';

describe('Compression (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());

    await app.register(compress, {
      threshold: 1024,
      encodings: ['gzip'],
      global: true,
    });

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  it('should return gzip-compressed response for JSON when Accept-Encoding is gzip', async () => {
    const res = await request(app.getHttpServer())
      .get('/your-large-json-endpoint') // use a route with a large enough JSON response
      .set('Accept-Encoding', 'gzip')
      .expect(200);

    expect(res.headers['content-encoding']).toBe('gzip');
    expect(res.body).toBeDefined(); // Will be automatically decoded by Supertest
  });

  it('should not compress small responses below threshold', async () => {
    const res = await request(app.getHttpServer())
      .get('/your-small-response-endpoint')
      .set('Accept-Encoding', 'gzip')
      .expect(200);

    expect(res.headers['content-encoding']).toBeUndefined();
  });

  afterAll(async () => {
    await app.close();
  });
});
