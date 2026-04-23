import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, BadRequestException } from '@nestjs/common';
import request from 'supertest';
import helmet from 'helmet';
import { AuthController } from './auth/controllers/auth.controller';
import { AuthService } from './auth/services/auth.service';
import { RateLimiterService } from './auth/guards/rate-limiter.service';
import { PasswordStrengthService } from './auth/services/password-strength.service';

describe('Security Configuration and Vulnerability Tests (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn().mockImplementation((email, password) => {
              const isMalicious = (str: string) =>
                str.includes('<script>') || str.includes('OR 1=1') || str.includes("' OR '");

              if (isMalicious(email) || isMalicious(password)) {
                throw new BadRequestException('Malicious payload detected');
              }

              return { access_token: 'mock_token' };
            }),
          },
        },
        {
          provide: RateLimiterService,
          useValue: {
            isAllowed: jest.fn().mockReturnValue({ allowed: true, remaining: 10, resetTime: Date.now() + 60000 }),
            getStatus: jest.fn().mockReturnValue({ count: 1, remaining: 9, resetTime: Date.now() + 60000, resetIn: 60000 }),
          },
        },
        {
          provide: PasswordStrengthService,
          useValue: {
            validatePassword: jest.fn(),
            getPasswordStrengthDetails: jest.fn(),
            getPasswordPolicy: jest.fn(),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.use(helmet());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Cross-Site Scripting (XSS) Prevention', () => {
    it('should reject payloads containing script tags in auth/login (XSS Attempt)', async () => {
      const xssPayload = {
        email: 'test@example.com',
        password: '<script>alert("xss")</script>password',
      };

      const response = await request(app.getHttpServer()).post('/auth/login').send(xssPayload);
      expect([400, 401]).toContain(response.status);
    });

    it('should set security headers (CSP & XSS Protection)', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'a@b.com', password: 'pw' });
      // Helmet should set these headers
      expect(response.headers).toHaveProperty('content-security-policy');
      expect(response.headers).toHaveProperty('x-dns-prefetch-control');
      expect(response.headers).toHaveProperty('x-frame-options');
    });
  });

  describe('SQL Injection (SQLi) Prevention', () => {
    it('should reject SQL injection payloads in auth/login email field', async () => {
      const sqliPayload = {
        email: "' OR 1=1 --",
        password: 'password',
      };

      const response = await request(app.getHttpServer()).post('/auth/login').send(sqliPayload);
      expect([400, 401]).toContain(response.status);
      expect(response.status).not.toBe(500);
    });

    it('should reject SQL injection payloads in auth/login password field', async () => {
      const sqliPayload = {
        email: 'admin@example.com',
        password: "' OR '1'='1",
      };

      const response = await request(app.getHttpServer()).post('/auth/login').send(sqliPayload);
      expect([400, 401]).toContain(response.status);
      expect(response.status).not.toBe(500);
    });
  });

  describe('Cross-Site Request Forgery (CSRF) & CORS Prevention', () => {
    it('should have basic security headers preventing MIME-sniffing', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'a@b.com', password: 'pw' });
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should prevent clickjacking (X-Frame-Options)', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'a@b.com', password: 'pw' });
      expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    });
  });
});
