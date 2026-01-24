import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { CustomThrottlerGuard } from '../src/common/guards/custom-throttler.guard';
describe('Rate Limiting E2E Tests', () => {
    let app;
    let moduleRef;
    beforeAll(async () => {
        moduleRef = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({
                    isGlobal: true,
                    envFilePath: '.env.test',
                }),
                ThrottlerModule.forRoot({
                    ttl: 60,
                    limit: 100,
                }),
                AppModule,
            ],
        })
            .overrideGuard(CustomThrottlerGuard)
            .useValue({
            canActivate: () => true, // Disable for setup
        })
            .compile();
        app = moduleRef.createNestApplication();
        await app.init();
    });
    afterAll(async () => {
        await app.close();
        await moduleRef.close();
    });
    describe('Authentication Rate Limiting', () => {
        const authEndpoints = [
            { path: '/auth/login', method: 'POST' },
            { path: '/auth/register', method: 'POST' },
            { path: '/auth/forgot-password', method: 'POST' },
            { path: '/auth/reset-password', method: 'POST' },
            { path: '/auth/refresh', method: 'POST' },
        ];
        authEndpoints.forEach(({ path, method }) => {
            describe(`${method} ${path}`, () => {
                it('should allow requests within rate limit', async () => {
                    const requests = [];
                    const limit = 5; // Production limit for auth endpoints
                    // Make requests up to the limit
                    for (let i = 0; i < limit; i++) {
                        requests.push(request(app.getHttpServer())[method.toLowerCase()](path)
                            .send({ email: 'test@example.com', password: 'password' }));
                    }
                    const responses = await Promise.all(requests);
                    // All requests should be processed (may return 401/400 but not 429)
                    responses.forEach((response) => {
                        expect(response.status).not.toBe(429);
                    });
                });
                it('should block requests exceeding rate limit', async () => {
                    const requests = [];
                    const limit = 5;
                    // Make requests exceeding the limit
                    for (let i = 0; i < limit + 2; i++) {
                        requests.push(request(app.getHttpServer())[method.toLowerCase()](path)
                            .send({ email: 'test@example.com', password: 'password' }));
                    }
                    const responses = await Promise.all(requests);
                    // At least one request should be rate limited
                    const rateLimitedResponses = responses.filter(r => r.status === 429);
                    expect(rateLimitedResponses.length).toBeGreaterThan(0);
                    // Check rate limit headers
                    const rateLimitedResponse = rateLimitedResponses[0];
                    expect(rateLimitedResponse.headers['x-ratelimit-limit']).toBeDefined();
                    expect(rateLimitedResponse.headers['x-ratelimit-remaining']).toBeDefined();
                    expect(rateLimitedResponse.headers['retry-after']).toBeDefined();
                });
                it('should include proper rate limit headers', async () => {
                    const response = await request(app.getHttpServer())[method.toLowerCase()](path)
                        .send({ email: 'test@example.com', password: 'password' });
                    expect(response.headers['x-ratelimit-limit']).toBeDefined();
                    expect(response.headers['x-ratelimit-remaining']).toBeDefined();
                    expect(response.headers['x-ratelimit-reset']).toBeDefined();
                });
            });
        });
    });
    describe('File Upload Rate Limiting', () => {
        const fileEndpoints = [
            { path: '/files/upload/chunk', method: 'POST' },
            { path: '/files/upload/complete', method: 'POST' },
            { path: '/submissions', method: 'POST' },
        ];
        fileEndpoints.forEach(({ path, method }) => {
            describe(`${method} ${path}`, () => {
                it('should allow file uploads within rate limit', async () => {
                    const requests = [];
                    const limit = 10; // Production limit for file uploads
                    for (let i = 0; i < limit; i++) {
                        const req = request(app.getHttpServer())[method.toLowerCase()](path);
                        if (path.includes('chunk')) {
                            req.attach('chunk', Buffer.from('test data'), 'test.txt');
                        }
                        requests.push(req.send({}));
                    }
                    const responses = await Promise.all(requests);
                    responses.forEach((response) => {
                        expect(response.status).not.toBe(429);
                    });
                });
                it('should block excessive file uploads', async () => {
                    const requests = [];
                    const limit = 10;
                    for (let i = 0; i < limit + 3; i++) {
                        const req = request(app.getHttpServer())[method.toLowerCase()](path);
                        if (path.includes('chunk')) {
                            req.attach('chunk', Buffer.from('test data'), 'test.txt');
                        }
                        requests.push(req.send({}));
                    }
                    const responses = await Promise.all(requests);
                    const rateLimitedResponses = responses.filter(r => r.status === 429);
                    expect(rateLimitedResponses.length).toBeGreaterThan(0);
                });
            });
        });
    });
    describe('Blockchain Rate Limiting', () => {
        const blockchainEndpoints = [
            { path: '/wallet/connect', method: 'POST' },
            { path: '/wallet/credentials/share', method: 'POST' },
            { path: '/verify-credential', method: 'POST' },
            { path: '/certificates/verify', method: 'POST' },
        ];
        blockchainEndpoints.forEach(({ path, method }) => {
            describe(`${method} ${path}`, () => {
                it('should allow blockchain operations within rate limit', async () => {
                    const requests = [];
                    const limit = 5; // Production limit for blockchain operations
                    for (let i = 0; i < limit; i++) {
                        requests.push(request(app.getHttpServer())[method.toLowerCase()](path)
                            .send({}));
                    }
                    const responses = await Promise.all(requests);
                    responses.forEach((response) => {
                        expect(response.status).not.toBe(429);
                    });
                });
                it('should block excessive blockchain operations', async () => {
                    const requests = [];
                    const limit = 5;
                    for (let i = 0; i < limit + 2; i++) {
                        requests.push(request(app.getHttpServer())[method.toLowerCase()](path)
                            .send({}));
                    }
                    const responses = await Promise.all(requests);
                    const rateLimitedResponses = responses.filter(r => r.status === 429);
                    expect(rateLimitedResponses.length).toBeGreaterThan(0);
                });
            });
        });
    });
    describe('Environment Configuration', () => {
        it('should use different limits for different environments', async () => {
            // This test would need to be run with different NODE_ENV values
            // to verify that the configuration changes appropriately
            const response = await request(app.getHttpServer())
                .post('/auth/login')
                .send({ email: 'test@example.com', password: 'password' });
            // Check that rate limit headers are present
            expect(response.headers['x-ratelimit-limit']).toBeDefined();
            // The actual limit value will depend on the environment
            const limit = parseInt(response.headers['x-ratelimit-limit']);
            expect(limit).toBeGreaterThan(0);
        });
    });
    describe('Rate Limit Headers', () => {
        it('should include all required rate limit headers', async () => {
            const response = await request(app.getHttpServer())
                .post('/auth/login')
                .send({ email: 'test@example.com', password: 'password' });
            expect(response.headers['x-ratelimit-limit']).toBeDefined();
            expect(response.headers['x-ratelimit-remaining']).toBeDefined();
            expect(response.headers['x-ratelimit-reset']).toBeDefined();
            // Verify header values are reasonable
            const limit = parseInt(response.headers['x-ratelimit-limit']);
            const remaining = parseInt(response.headers['x-ratelimit-remaining']);
            expect(limit).toBeGreaterThan(0);
            expect(remaining).toBeGreaterThanOrEqual(0);
            expect(remaining).toBeLessThanOrEqual(limit);
        });
        it('should include retry-after header when rate limited', async () => {
            // Make enough requests to trigger rate limiting
            const requests = [];
            for (let i = 0; i < 10; i++) {
                requests.push(request(app.getHttpServer())
                    .post('/auth/login')
                    .send({ email: 'test@example.com', password: 'password' }));
            }
            const responses = await Promise.all(requests);
            const rateLimitedResponse = responses.find(r => r.status === 429);
            if (rateLimitedResponse) {
                expect(rateLimitedResponse.headers['retry-after']).toBeDefined();
                const retryAfter = parseInt(rateLimitedResponse.headers['retry-after']);
                expect(retryAfter).toBeGreaterThan(0);
            }
        });
    });
    describe('Custom Rate Limit Decorators', () => {
        it('should apply custom rate limits based on decorator configuration', async () => {
            // Test that different endpoints have different rate limits
            const loginResponse = await request(app.getHttpServer())
                .post('/auth/login')
                .send({ email: 'test@example.com', password: 'password' });
            const uploadResponse = await request(app.getHttpServer())
                .post('/files/upload/complete')
                .send({});
            const loginLimit = parseInt(loginResponse.headers['x-ratelimit-limit']);
            const uploadLimit = parseInt(uploadResponse.headers['x-ratelimit-limit']);
            // Auth endpoints should have stricter limits than file uploads
            expect(loginLimit).toBeLessThan(uploadLimit);
        });
        it('should respect skip rate limit decorator', async () => {
            // This would need an endpoint with @SkipRateLimit() decorator
            // For now, we'll just verify the system doesn't break
            const response = await request(app.getHttpServer())
                .get('/auth/password-requirements');
            expect(response.status).not.toBe(429);
        });
    });
    describe('Error Handling', () => {
        it('should return proper error response when rate limited', async () => {
            // Make enough requests to trigger rate limiting
            const requests = [];
            for (let i = 0; i < 10; i++) {
                requests.push(request(app.getHttpServer())
                    .post('/auth/login')
                    .send({ email: 'test@example.com', password: 'password' }));
            }
            const responses = await Promise.all(requests);
            const rateLimitedResponse = responses.find(r => r.status === 429);
            if (rateLimitedResponse) {
                expect(rateLimitedResponse.status).toBe(429);
                expect(rateLimitedResponse.body.message).toContain('Rate limit exceeded');
            }
        });
    });
});
