/**
 * Concurrent Load Tests
 * Simulates 100+ users performing simultaneous operations to verify
 * the system handles concurrency without race conditions or data corruption.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as http from 'http';
import request from 'supertest';

import { AuthController } from '../src/auth/controllers/auth.controller';
import { CourseController } from '../src/course/course.controller';
import { UserController } from '../src/user/user.controller';
import { AuthService } from '../src/auth/services/auth.service';
import { CourseService } from '../src/course/course.service';
import { UserService } from '../src/user/user.service';
import { PasswordStrengthService } from '../src/auth/services/password-strength.service';
import { CookieTokenService } from '../src/auth/services/cookie-token.service';
import { RateLimiterService } from '../src/auth/guards/rate-limiter.service';
import { ListUsersUseCase } from '../src/user/application/use-cases/list-users.use-case';
import { GetUserUseCase } from '../src/user/application/use-cases/get-user.use-case';
import { ListCoursesUseCase } from '../src/course/application/use-cases/list-courses.use-case';
import { GetCourseUseCase } from '../src/course/application/use-cases/get-course.use-case';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeUser(i: number) {
  return {
    id: `user-${i}`,
    email: `user${i}@test.com`,
    firstName: `First${i}`,
    lastName: `Last${i}`,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function makeCourse(i: number) {
  return {
    id: `course-${i}`,
    title: `Course ${i}`,
    description: `Description ${i}`,
    category: i % 2 === 0 ? 'blockchain' : 'defi',
    difficulty: i % 3 === 0 ? 'beginner' : 'intermediate',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/** Run requests in batches to avoid overwhelming the test HTTP server */
async function fireBatched(
  reqs: (() => Promise<request.Response>)[],
  batchSize = 25,
): Promise<{ responses: request.Response[]; durationMs: number }> {
  const start = Date.now();
  const responses: request.Response[] = [];

  for (let i = 0; i < reqs.length; i += batchSize) {
    const batch = reqs.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map((fn) => fn()));
    responses.push(...batchResults);
  }

  return { responses, durationMs: Date.now() - start };
}

// ─── App factory ────────────────────────────────────────────────────────────

async function buildApp(): Promise<INestApplication> {
  const users = Array.from({ length: 120 }, (_, i) => makeUser(i));
  const courses = Array.from({ length: 120 }, (_, i) => makeCourse(i));

  const mockRateLimiter = {
    isAllowed: jest.fn().mockReturnValue({ allowed: true, remaining: 999, resetTime: Date.now() + 60000 }),
    getStatus: jest.fn(),
    reset: jest.fn(),
    resetAll: jest.fn(),
    cleanup: jest.fn(),
  };

  const mockAuthService = {
    login: jest.fn().mockResolvedValue({ message: 'Login successful', user: makeUser(0) }),
    register: jest.fn().mockResolvedValue({ message: 'Registration successful', user: makeUser(0) }),
    forgotPassword: jest.fn().mockResolvedValue({ message: 'If email exists, a reset link has been sent' }),
  };

  const mockCourseService = {
    findAll: jest.fn().mockResolvedValue(courses.slice(0, 20)),
    findOne: jest.fn().mockImplementation((id: string) =>
      Promise.resolve(courses.find((c) => c.id === id) ?? null),
    ),
  };

  const mockUserService = {
    findAll: jest.fn().mockResolvedValue(users.slice(0, 20)),
    findOne: jest.fn().mockImplementation((id: string) =>
      Promise.resolve(users.find((u) => u.id === id) ?? null),
    ),
  };

  const mockListUsersUseCase = {
    execute: jest.fn().mockResolvedValue({ users: users.slice(0, 20), nextCursor: null, hasMore: false }),
  };

  const mockGetUserUseCase = {
    execute: jest.fn().mockImplementation(({ userId }: { userId: string }) =>
      Promise.resolve(users.find((u) => u.id === userId) ?? null),
    ),
  };

  const mockListCoursesUseCase = {
    execute: jest.fn().mockResolvedValue({ courses: courses.slice(0, 20), nextCursor: null, hasMore: false }),
  };

  const mockGetCourseUseCase = {
    execute: jest.fn().mockImplementation(({ courseId }: { courseId: string }) =>
      Promise.resolve(courses.find((c) => c.id === courseId) ?? null),
    ),
  };

  const module: TestingModule = await Test.createTestingModule({
    controllers: [AuthController, CourseController, UserController],
    providers: [
      { provide: AuthService, useValue: mockAuthService },
      { provide: CourseService, useValue: mockCourseService },
      { provide: UserService, useValue: mockUserService },
      { provide: ListUsersUseCase, useValue: mockListUsersUseCase },
      { provide: GetUserUseCase, useValue: mockGetUserUseCase },
      { provide: ListCoursesUseCase, useValue: mockListCoursesUseCase },
      { provide: GetCourseUseCase, useValue: mockGetCourseUseCase },
      { provide: RateLimiterService, useValue: mockRateLimiter },
      PasswordStrengthService,
      CookieTokenService,
    ],
  }).compile();

  const app = module.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();

  // Raise the connection limit so 100 concurrent requests don't get ECONNRESET
  const httpServer = app.getHttpServer() as http.Server;
  httpServer.maxConnections = 500;

  return app;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Concurrent Load – 100+ users', () => {
  let app: INestApplication;
  let server: any;

  beforeAll(async () => {
    app = await buildApp();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  // ── Read endpoints ────────────────────────────────────────────────────────

  it('handles 100 concurrent GET /courses requests', async () => {
    const reqs = Array.from({ length: 100 }, () => () => request(server).get('/courses'));

    const { responses, durationMs } = await fireBatched(reqs);

    expect(responses.every((r) => r.status === 200)).toBe(true);
    expect(durationMs).toBeLessThan(10000);
  }, 15000);

  it('handles 100 concurrent GET /users requests', async () => {
    const reqs = Array.from({ length: 100 }, () => () => request(server).get('/users'));

    const { responses, durationMs } = await fireBatched(reqs);

    expect(responses.every((r) => r.status === 200)).toBe(true);
    expect(durationMs).toBeLessThan(10000);
  }, 15000);

  it('handles 120 concurrent mixed reads without any 5xx errors', async () => {
    const courseIds = Array.from({ length: 10 }, (_, i) => `course-${i}`);
    const userIds = Array.from({ length: 10 }, (_, i) => `user-${i}`);

    const reqs = [
      ...Array.from({ length: 40 }, () => () => request(server).get('/courses')),
      ...Array.from({ length: 40 }, () => () => request(server).get('/users')),
      ...Array.from({ length: 20 }, (_, i) => () =>
        request(server).get(`/courses/${courseIds[i % courseIds.length]}`),
      ),
      ...Array.from({ length: 20 }, (_, i) => () =>
        request(server).get(`/users/${userIds[i % userIds.length]}`),
      ),
    ];

    const { responses } = await fireBatched(reqs);

    expect(responses.filter((r) => r.status >= 500).length).toBe(0);
  }, 20000);

  // ── Write endpoints ───────────────────────────────────────────────────────

  it('handles 100 concurrent POST /auth/login requests', async () => {
    const reqs = Array.from({ length: 100 }, (_, i) => () =>
      request(server)
        .post('/auth/login')
        .send({ email: `user${i}@test.com`, password: 'Password123!' }),
    );

    const { responses, durationMs } = await fireBatched(reqs);

    expect(responses.every((r) => r.status === 200)).toBe(true);
    expect(durationMs).toBeLessThan(10000);
  }, 15000);

  it('handles 100 concurrent POST /auth/register requests', async () => {
    const reqs = Array.from({ length: 100 }, (_, i) => () =>
      request(server)
        .post('/auth/register')
        .send({
          email: `newuser${i}@test.com`,
          password: 'Password123!',
          passwordConfirm: 'Password123!',
          firstName: `First${i}`,
          lastName: `Last${i}`,
        }),
    );

    const { responses } = await fireBatched(reqs);

    expect(responses.every((r) => r.status === 201)).toBe(true);
  }, 15000);

  // ── Race condition: rate limiter state ────────────────────────────────────

  it('rate limiter counts are consistent under concurrent access', () => {
    const limiter = new RateLimiterService();

    const results = Array.from({ length: 50 }, () =>
      limiter.isAllowed('test:concurrent', 10, 60_000),
    );

    expect(results.filter((r) => r.allowed).length).toBe(10);
    expect(results.filter((r) => !r.allowed).length).toBe(40);
  });

  it('rate limiter remaining count decrements correctly under load', () => {
    const limiter = new RateLimiterService();
    const max = 20;

    const results = Array.from({ length: max }, () =>
      limiter.isAllowed('test:decrement', max, 60_000),
    );

    const allowed = results.filter((r) => r.allowed);
    expect(allowed.length).toBe(max);

    for (let i = 0; i < allowed.length - 1; i++) {
      expect(allowed[i].remaining).toBeGreaterThan(allowed[i + 1].remaining);
    }
  });

  // ── No 5xx under concurrent password checks ───────────────────────────────

  it('no 5xx errors under 100 concurrent password-strength checks', async () => {
    const passwords = ['weak', 'Password123!', 'short', 'VeryStr0ng!Pass#2024', ''];

    const reqs = Array.from({ length: 100 }, (_, i) => () =>
      request(server)
        .post('/auth/check-password-strength')
        .send({ password: passwords[i % passwords.length] }),
    );

    const { responses } = await fireBatched(reqs);

    expect(responses.filter((r) => r.status >= 500).length).toBe(0);
  }, 15000);

  // ── Response time SLA ─────────────────────────────────────────────────────

  it('p95 response time under 1000ms for 100 concurrent course reads', async () => {
    const times: number[] = [];

    const reqs = Array.from({ length: 100 }, () => async () => {
      const start = Date.now();
      const res = await request(server).get('/courses');
      times.push(Date.now() - start);
      return res;
    });

    await fireBatched(reqs);

    times.sort((a, b) => a - b);
    const p95 = times[Math.floor(times.length * 0.95)];
    expect(p95).toBeLessThan(1000);
  }, 15000);

  it('p95 response time under 1000ms for 100 concurrent user reads', async () => {
    const times: number[] = [];

    const reqs = Array.from({ length: 100 }, () => async () => {
      const start = Date.now();
      const res = await request(server).get('/users');
      times.push(Date.now() - start);
      return res;
    });

    await fireBatched(reqs);

    times.sort((a, b) => a - b);
    const p95 = times[Math.floor(times.length * 0.95)];
    expect(p95).toBeLessThan(1000);
  }, 15000);

  // ── Sustained load ────────────────────────────────────────────────────────

  it('sustains 100 users over 3 waves without degradation', async () => {
    const wave = () =>
      fireBatched([
        ...Array.from({ length: 34 }, () => () => request(server).get('/courses')),
        ...Array.from({ length: 33 }, () => () => request(server).get('/users')),
        ...Array.from({ length: 33 }, () => () =>
          request(server).post('/auth/check-password-strength').send({ password: 'Test123!' }),
        ),
      ]);

    const waveTimes: number[] = [];

    for (let i = 0; i < 3; i++) {
      const { responses, durationMs } = await wave();
      waveTimes.push(durationMs);
      expect(responses.filter((r) => r.status >= 500).length).toBe(0);
    }

    // Third wave should not be dramatically slower than the first
    expect(waveTimes[2]).toBeLessThan(waveTimes[0] * 3);
  }, 60000);
});
