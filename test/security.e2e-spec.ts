import { Test, TestingModule } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './../src/app.module';

describe('Security Configuration (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  it('Requirement: Hide X-Powered-By header', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/',
    });
    // X-Powered-By should be removed to prevent fingerprinting
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('Requirement: Security Headers (Helmet/FrameOptions)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/',
    });
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['content-security-policy']).toBeDefined();
  });

  it('Requirement: CORS Policy', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/',
      headers: { origin: 'http://localhost:3000' }
    });
    // Verifies that our CORS setup in main.ts is working
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
  });

  afterAll(async () => {
    await app.close();
  });
});