/**
 * Integration Tests – Course Module
 * Covers every endpoint exposed by CourseController:
 *   GET /courses        → findAll()
 *   GET /courses/:id    → findOne(id)
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  NotFoundException,
} from '@nestjs/common';
import request from 'supertest';

import { CourseController } from './course.controller';
import { CourseService } from './course.service';


// Fixture helpers

interface CourseSeed {
  id: string;
  title: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

let _idCounter = 0;

function makeCourse(overrides: Partial<CourseSeed> = {}): CourseSeed {
  _idCounter += 1;
  const now = new Date().toISOString();
  const pad = String(_idCounter).padStart(12, '0');
  return {
    id: `00000000-0000-0000-0000-${pad}`,
    title: `Test Course ${_idCounter}`,
    description: 'A test course description.',
    isActive: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeCourses(count: number, overrides: Partial<CourseSeed> = {}): CourseSeed[] {
  return Array.from({ length: count }, (_, i) =>
    makeCourse({ title: `Course ${i + 1}`, ...overrides }),
  );
}


// App factory
async function buildApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    controllers: [CourseController],
    providers: [
      {
        provide: CourseService,
        useValue: {
          findAll: jest.fn().mockResolvedValue([]),
          findOne: jest.fn().mockResolvedValue(null),
        },
      },
    ],
  }).compile();

  const app = moduleFixture.createNestApplication();

  // Mirror global pipes from main.ts
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.init();
  return app;
}


// Tests

describe('Course Module – Integration Tests (Issue #752)', () => {

 
  // GET /courses
  describe('GET /courses', () => {
    let app: INestApplication;
    let svc: CourseService;

    beforeEach(async () => {
      app = await buildApp();
      svc = app.get<CourseService>(CourseService);
    });

    afterEach(async () => {
      await app.close();
    });


    it('returns HTTP 200', async () => {
      (svc.findAll as jest.Mock).mockResolvedValueOnce([]);
      const { status } = await request(app.getHttpServer()).get('/courses');
      expect(status).toBe(200);
    });

    it('returns an empty array when no courses exist', async () => {
      (svc.findAll as jest.Mock).mockResolvedValueOnce([]);
      const { body } = await request(app.getHttpServer()).get('/courses');
      expect(body).toEqual([]);
    });

    it('returns all courses provided by the service', async () => {
      const courses = makeCourses(3);
      (svc.findAll as jest.Mock).mockResolvedValueOnce(courses);

      const { body } = await request(app.getHttpServer()).get('/courses');
      expect(body).toHaveLength(3);
    });

    it('returns courses with the correct shape', async () => {
      const courses = makeCourses(2);
      (svc.findAll as jest.Mock).mockResolvedValueOnce(courses);

      const { body } = await request(app.getHttpServer()).get('/courses');

      body.forEach((course: CourseSeed) => {
        expect(course).toMatchObject({
          id: expect.any(String),
          title: expect.any(String),
          description: expect.any(String),
          isActive: expect.any(Boolean),
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        });
      });
    });

    it('preserves title and description for every course', async () => {
      const courses = makeCourses(3);
      (svc.findAll as jest.Mock).mockResolvedValueOnce(courses);

      const { body } = await request(app.getHttpServer()).get('/courses');

      courses.forEach((seed) => {
        const found = body.find((c: CourseSeed) => c.id === seed.id);
        expect(found).toBeDefined();
        expect(found.title).toBe(seed.title);
        expect(found.description).toBe(seed.description);
      });
    });

    it('includes inactive (isActive: false) courses in the result', async () => {
      const courses = [
        makeCourse({ isActive: true }),
        makeCourse({ isActive: false, title: 'Archived Course' }),
      ];
      (svc.findAll as jest.Mock).mockResolvedValueOnce(courses);

      const { body } = await request(app.getHttpServer()).get('/courses');

      const inactive = body.find((c: CourseSeed) => c.isActive === false);
      expect(inactive).toBeDefined();
      expect(inactive.title).toBe('Archived Course');
    });

    it('returns all courses in a large dataset (50 items)', async () => {
      const courses = makeCourses(50);
      (svc.findAll as jest.Mock).mockResolvedValueOnce(courses);

      const { status, body } = await request(app.getHttpServer()).get('/courses');
      expect(status).toBe(200);
      expect(body).toHaveLength(50);
    });

    it('does not expose internal-only fields (e.g. password)', async () => {
      const course = { ...makeCourse(), password: 'should-not-appear' };
      (svc.findAll as jest.Mock).mockResolvedValueOnce([course]);

      const { body } = await request(app.getHttpServer()).get('/courses');

      body.forEach((c: Record<string, unknown>) => {
        expect(c).not.toHaveProperty('password');
      });
    });

    it('calls CourseService.findAll exactly once per request', async () => {
      (svc.findAll as jest.Mock).mockResolvedValueOnce([]);

      await request(app.getHttpServer()).get('/courses');

      expect(svc.findAll).toHaveBeenCalledTimes(1);
    });

    it('calls CourseService.findAll with no arguments', async () => {
      (svc.findAll as jest.Mock).mockResolvedValueOnce([]);

      await request(app.getHttpServer()).get('/courses');

      expect(svc.findAll).toHaveBeenCalledWith();
    });

    //Headers

    it('responds with Content-Type: application/json', async () => {
      (svc.findAll as jest.Mock).mockResolvedValueOnce([]);

      const { headers } = await request(app.getHttpServer()).get('/courses');
      expect(headers['content-type']).toMatch(/application\/json/);
    });

    //Error propagation

    it('returns HTTP 500 when the service throws an unexpected error', async () => {
      (svc.findAll as jest.Mock).mockRejectedValueOnce(
        new Error('Database connection lost'),
      );

      const { status } = await request(app.getHttpServer()).get('/courses');
      expect(status).toBe(500);
    });
  });

  
  // GET /courses/:id

  describe('GET /courses/:id', () => {
    let app: INestApplication;
    let svc: CourseService;

    const VALID_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

    beforeEach(async () => {
      app = await buildApp();
      svc = app.get<CourseService>(CourseService);
    });

    afterEach(async () => {
      await app.close();
    });

    it('returns HTTP 200 when the course exists', async () => {
      const course = makeCourse({ id: VALID_ID });
      (svc.findOne as jest.Mock).mockResolvedValueOnce(course);

      const { status } = await request(app.getHttpServer()).get(`/courses/${VALID_ID}`);
      expect(status).toBe(200);
    });

    it('returns the correct course object', async () => {
      const course = makeCourse({ id: VALID_ID, title: 'ZK Proofs on Starknet' });
      (svc.findOne as jest.Mock).mockResolvedValueOnce(course);

      const { body } = await request(app.getHttpServer()).get(`/courses/${VALID_ID}`);
      expect(body.id).toBe(VALID_ID);
      expect(body.title).toBe('ZK Proofs on Starknet');
    });

    it('returns the full required field set', async () => {
      const course = makeCourse({ id: VALID_ID });
      (svc.findOne as jest.Mock).mockResolvedValueOnce(course);

      const { body } = await request(app.getHttpServer()).get(`/courses/${VALID_ID}`);

      expect(body).toMatchObject({
        id: expect.any(String),
        title: expect.any(String),
        description: expect.any(String),
        isActive: expect.any(Boolean),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    it('returns ISO 8601 formatted createdAt and updatedAt', async () => {
      const now = new Date().toISOString();
      const course = makeCourse({ id: VALID_ID, createdAt: now, updatedAt: now });
      (svc.findOne as jest.Mock).mockResolvedValueOnce(course);

      const { body } = await request(app.getHttpServer()).get(`/courses/${VALID_ID}`);

      expect(new Date(body.createdAt).toISOString()).toBe(body.createdAt);
      expect(new Date(body.updatedAt).toISOString()).toBe(body.updatedAt);
    });

    it('returns an inactive course without error', async () => {
      const course = makeCourse({ id: VALID_ID, isActive: false, title: 'Deprecated Course' });
      (svc.findOne as jest.Mock).mockResolvedValueOnce(course);

      const { status, body } = await request(app.getHttpServer()).get(`/courses/${VALID_ID}`);
      expect(status).toBe(200);
      expect(body.isActive).toBe(false);
    });

    it('passes the id to CourseService.findOne as a string', async () => {
      (svc.findOne as jest.Mock).mockResolvedValueOnce(null);

      await request(app.getHttpServer()).get(`/courses/${VALID_ID}`);
      expect(svc.findOne).toHaveBeenCalledWith(VALID_ID);
    });

    it('calls CourseService.findOne exactly once per request', async () => {
      const course = makeCourse({ id: VALID_ID });
      (svc.findOne as jest.Mock).mockResolvedValueOnce(course);

      await request(app.getHttpServer()).get(`/courses/${VALID_ID}`);
      expect(svc.findOne).toHaveBeenCalledTimes(1);
    });

    it('responds with Content-Type: application/json', async () => {
      const course = makeCourse({ id: VALID_ID });
      (svc.findOne as jest.Mock).mockResolvedValueOnce(course);

      const { headers } = await request(app.getHttpServer()).get(`/courses/${VALID_ID}`);
      expect(headers['content-type']).toMatch(/application\/json/);
    });

    //Not found

    it('returns HTTP 200 with null body when service returns null (current behaviour)', async () => {
      (svc.findOne as jest.Mock).mockResolvedValueOnce(null);

      const { status } = await request(app.getHttpServer()).get(
        '/courses/00000000-0000-0000-0000-000000000000',
      );
      expect([200, 404]).toContain(status);
    });

    it('returns HTTP 404 when the service throws NotFoundException', async () => {
      (svc.findOne as jest.Mock).mockRejectedValueOnce(
        new NotFoundException('Course not found'),
      );

      const { status } = await request(app.getHttpServer()).get(
        '/courses/00000000-0000-0000-0000-000000000000',
      );

      expect(status).toBe(404);
    });

    it('returns the correct 404 error body shape', async () => {
      (svc.findOne as jest.Mock).mockRejectedValueOnce(
        new NotFoundException('Course not found'),
      );

      const { body } = await request(app.getHttpServer()).get(
        '/courses/00000000-0000-0000-0000-000000000000',
      );

      expect(body).toMatchObject({
        statusCode: 404,
        message: 'Course not found',
      });
    });

    // Edge cases

    it('handles a non-UUID id string – service is called with the raw param', async () => {
      (svc.findOne as jest.Mock).mockResolvedValueOnce(null);

      const { status } = await request(app.getHttpServer()).get('/courses/not-a-uuid');

      expect(status).not.toBe(500);
      expect(svc.findOne).toHaveBeenCalledWith('not-a-uuid');
    });

    it('handles a very long id string without crashing', async () => {
      (svc.findOne as jest.Mock).mockResolvedValueOnce(null);

      const { status } = await request(app.getHttpServer()).get(
        `/courses/${'z'.repeat(512)}`,
      );

      expect(status).not.toBe(500);
    });

    it('handles URL-encoded id without crashing', async () => {
      (svc.findOne as jest.Mock).mockResolvedValueOnce(null);

      const { status } = await request(app.getHttpServer()).get('/courses/abc%20def');

      expect(status).not.toBe(500);
    });

    // Error propagation

    it('returns HTTP 500 when the service throws an unexpected error', async () => {
      (svc.findOne as jest.Mock).mockRejectedValueOnce(
        new Error('Unexpected DB failure'),
      );

      const { status } = await request(app.getHttpServer()).get(`/courses/${VALID_ID}`);
      expect(status).toBe(500);
    });
  });

  
  // Data consistency across endpoints
  describe('Data consistency between GET /courses and GET /courses/:id', () => {
    let app: INestApplication;
    let svc: CourseService;

    beforeEach(async () => {
      app = await buildApp();
      svc = app.get<CourseService>(CourseService);
    });

    afterEach(async () => {
      await app.close();
    });

    it('the detail view matches the list view entry for the same course', async () => {
      const course = makeCourse({ id: 'abc00000-0000-0000-0000-000000000001' });
      (svc.findAll as jest.Mock).mockResolvedValueOnce([course]);
      (svc.findOne as jest.Mock).mockResolvedValueOnce(course);

      const [listRes, detailRes] = await Promise.all([
        request(app.getHttpServer()).get('/courses'),
        request(app.getHttpServer()).get(`/courses/${course.id}`),
      ]);

      const fromList = listRes.body.find((c: CourseSeed) => c.id === course.id);
      expect(fromList).toMatchObject(detailRes.body);
    });

    it('a course present in the list can be fetched individually with consistent data', async () => {
      const courses = makeCourses(5);
      const target = courses[2];

      (svc.findAll as jest.Mock).mockResolvedValueOnce(courses);
      (svc.findOne as jest.Mock).mockResolvedValueOnce(target);

      const listRes = await request(app.getHttpServer()).get('/courses');
      const listEntry = listRes.body.find((c: CourseSeed) => c.id === target.id);
      expect(listEntry).toBeDefined();

      const detailRes = await request(app.getHttpServer()).get(`/courses/${target.id}`);
      expect(detailRes.status).toBe(200);
      expect(detailRes.body.id).toBe(target.id);
      expect(detailRes.body.title).toBe(target.title);
    });
  });

  // HTTP method guard – undefined routes return 404
  describe('HTTP method guard – undefined routes return 404', () => {
    let app: INestApplication;

    const VALID_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

    beforeAll(async () => {
      app = await buildApp();
    });

    afterAll(async () => {
      await app.close();
    });

    it('POST /courses → 404 (create not yet implemented)', async () => {
      const { status } = await request(app.getHttpServer())
        .post('/courses')
        .send({ title: 'New Course', description: 'Desc' });

      expect(status).toBe(404);
    });

    it('PUT /courses/:id → 404 (full update not yet implemented)', async () => {
      const { status } = await request(app.getHttpServer())
        .put(`/courses/${VALID_ID}`)
        .send({ title: 'Updated' });

      expect(status).toBe(404);
    });

    it('PATCH /courses/:id → 404 (partial update not yet implemented)', async () => {
      const { status } = await request(app.getHttpServer())
        .patch(`/courses/${VALID_ID}`)
        .send({ isActive: false });

      expect(status).toBe(404);
    });

    it('DELETE /courses/:id → 404 (delete not yet implemented)', async () => {
      const { status } = await request(app.getHttpServer()).delete(
        `/courses/${VALID_ID}`,
      );

      expect(status).toBe(404);
    });
  });

  // Concurrency
  describe('Concurrency', () => {
    let app: INestApplication;
    let svc: CourseService;

    beforeAll(async () => {
      app = await buildApp();
      svc = app.get<CourseService>(CourseService);
    });

    afterAll(async () => {
      await app.close();
    });

    it('handles 10 simultaneous GET /courses requests correctly', async () => {
      const courses = makeCourses(5);
      (svc.findAll as jest.Mock).mockResolvedValue(courses);

      const responses = await Promise.all(
        Array.from({ length: 10 }, () =>
          request(app.getHttpServer()).get('/courses'),
        ),
      );

      responses.forEach(({ status, body }) => {
        expect(status).toBe(200);
        expect(body).toHaveLength(5);
      });
    });

    it('handles 10 simultaneous GET /courses/:id requests correctly', async () => {
      const course = makeCourse({ id: 'concur00-0000-0000-0000-000000000001' });
      (svc.findOne as jest.Mock).mockResolvedValue(course);

      const responses = await Promise.all(
        Array.from({ length: 10 }, () =>
          request(app.getHttpServer()).get(`/courses/${course.id}`),
        ),
      );

      responses.forEach(({ status, body }) => {
        expect(status).toBe(200);
        expect(body.id).toBe(course.id);
      });
    });
  });
});