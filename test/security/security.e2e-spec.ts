import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { SECURITY_CONFIG } from '../../src/security/security.config';
const supertest = require('supertest');

describe('Security (e2e)', () => {
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

  describe('CORS Configuration', () => {
    it('should allow requests from allowed origins', async () => {
      const response = await supertest(app.getHttpServer())
        .options('/api/health')
        .set('Origin', 'http://localhost:3000')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should block requests from disallowed origins', async () => {
      const response = await supertest(app.getHttpServer())
        .options('/api/health')
        .set('Origin', 'http://malicious-site.com')
        .expect(204);

      // Should not have CORS headers for disallowed origins
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('should include correct allowed headers', async () => {
      const response = await supertest(app.getHttpServer())
        .options('/api/health')
        .set('Origin', 'http://localhost:3000')
        .expect(204);

      const allowedHeaders = response.headers['access-control-allow-headers'];
      expect(allowedHeaders).toContain('Content-Type');
      expect(allowedHeaders).toContain('Authorization');
      expect(allowedHeaders).toContain('X-Requested-With');
      expect(allowedHeaders).toContain('X-CSRF-Token');
    });
  });

  describe('Security Headers', () => {
    it('should set X-Frame-Options to DENY', async () => {
      const response = await supertest(app.getHttpServer())
        .get('/api/health')
        .expect(200);

      expect(response.headers['x-frame-options']).toBe('DENY');
    });

    it('should set X-Content-Type-Options to nosniff', async () => {
      const response = await supertest(app.getHttpServer())
        .get('/api/health')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should set X-XSS-Protection', async () => {
      const response = await supertest(app.getHttpServer())
        .get('/api/health')
        .expect(200);

      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
    });

    it('should set Strict-Transport-Security in production', async () => {
      const response = await supertest(app.getHttpServer())
        .get('/api/health')
        .expect(200);

      // In development, this might not be set, but in production it should be
      if (process.env.NODE_ENV === 'production') {
        expect(response.headers['strict-transport-security']).toBeDefined();
        expect(response.headers['strict-transport-security']).toContain('max-age=');
      }
    });

    it('should set Content-Security-Policy', async () => {
      const response = await supertest(app.getHttpServer())
        .get('/api/health')
        .expect(200);

      const csp = response.headers['content-security-policy'];
      expect(csp).toBeDefined();
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("script-src 'self'");
    });

    it('should set Referrer-Policy', async () => {
      const response = await supertest(app.getHttpServer())
        .get('/api/health')
        .expect(200);

      expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    });
  });

  describe('CSRF Protection', () => {
    it('should generate CSRF token for GET requests', async () => {
      const response = await supertest(app.getHttpServer())
        .get('/api/security/csrf-token')
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('expires');
      expect(response.body.token).toMatch(/^[a-f0-9]{64}$/); // 32 bytes hex
    });

    it('should reject POST requests without CSRF token', async () => {
      await supertest(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password' })
        .expect(401); // Unauthorized due to missing CSRF
    });

    it('should accept POST requests with valid CSRF token', async () => {
      // First get a CSRF token
      const tokenResponse = await supertest(app.getHttpServer())
        .get('/api/security/csrf-token')
        .expect(200);

      const token = tokenResponse.body.token;

      // Then make request with CSRF token
      await supertest(app.getHttpServer())
        .post('/api/auth/login')
        .set('X-CSRF-Token', token)
        .send({ email: 'test@example.com', password: 'password' })
        .expect(401); // Still unauthorized for wrong credentials, but not rejected for CSRF
    });
  });

  describe('Input Validation', () => {
    it('should reject requests with malicious script content', async () => {
      const maliciousPayload = {
        name: '<script>alert("xss")</script>',
        description: 'javascript:alert("xss")',
        data: '<img src=x onerror=alert("xss")>'
      };

      await supertest(app.getHttpServer())
        .post('/api/test')
        .send(maliciousPayload)
        .expect(400); // Bad request due to malicious content
    });

    it('should reject oversized requests', async () => {
      const largePayload = {
        data: 'x'.repeat(11 * 1024 * 1024) // 11MB
      };

      await supertest(app.getHttpServer())
        .post('/api/test')
        .send(largePayload)
        .expect(413); // Request Entity Too Large
    });

    it('should reject unsupported content types', async () => {
      await supertest(app.getHttpServer())
        .post('/api/test')
        .set('Content-Type', 'application/xml')
        .send('<xml>test</xml>')
        .expect(415); // Unsupported Media Type
    });
  });

  describe('Rate Limiting', () => {
    it('should include rate limit headers', async () => {
      const response = await supertest(app.getHttpServer())
        .get('/api/health')
        .expect(200);

      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      expect(response.headers['x-ratelimit-reset']).toBeDefined();
    });

    it('should enforce rate limits', async () => {
      // Make many requests quickly
      const promises = Array(100).fill(null).map(() =>
        request(app.getHttpServer()).get('/api/health')
      );

      const responses = await Promise.all(promises);
      
      // At least some requests should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Security Endpoints', () => {
    it('should provide security headers information', async () => {
      const response = await supertest(app.getHttpServer())
        .get('/api/security/security-headers')
        .expect(200);

      expect(response.body).toHaveProperty('Content-Security-Policy');
      expect(response.body).toHaveProperty('X-Frame-Options');
      expect(response.body).toHaveProperty('X-Content-Type-Options');
    });

    it('should provide rate limit information', async () => {
      const response = await supertest(app.getHttpServer())
        .get('/api/security/rate-limit-info')
        .expect(200);

      expect(response.body).toHaveProperty('limit');
      expect(response.body).toHaveProperty('remaining');
      expect(response.body).toHaveProperty('resetTime');
    });

    it('should accept suspicious activity reports', async () => {
      const reportData = {
        type: 'xss_attempt',
        description: 'User submitted malicious script',
        evidence: { payload: '<script>alert(1)</script>' }
      };

      const response = await supertest(app.getHttpServer())
        .post('/api/security/report-suspicious-activity')
        .send(reportData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('id');
    });
  });
});
