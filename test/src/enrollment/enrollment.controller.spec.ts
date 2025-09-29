import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('EnrollmentController (e2e)', () => {
  let app: INestApplication;
  let token = 'mocked-token'; // Replace with real token if auth is active

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/enrollments (POST)', async () => {
    const dto = { studentId: 'john123', courseId: 'course1' };

    const response = await request(app.getHttpServer())
      .post('/enrollments')
      .set('Authorization', `Bearer ${token}`)
      .send(dto)
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.studentId).toBe(dto.studentId);
  });

  it('/enrollments (GET)', async () => {
    const res = await request(app.getHttpServer())
      .get('/enrollments')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });

  it('/enrollments/:id (DELETE)', async () => {
    // First, enroll
    const dto = { studentId: 'deletetest', courseId: 'course1' };
    const { body } = await request(app.getHttpServer())
      .post('/enrollments')
      .set('Authorization', `Bearer ${token}`)
      .send(dto)
      .expect(201);

    // Then, delete
    await request(app.getHttpServer())
      .delete(`/enrollments/${body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  afterAll(async () => {
    await app.close();
  });
});
