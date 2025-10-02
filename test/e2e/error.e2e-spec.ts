import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Error Handling (e2e)', () => {
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

  it('/test-error/validation (GET)', () => {
    return request(app.getHttpServer())
      .get('/test-error/validation')
      .expect(400)
      .then((response) => {
        expect(response.body).toEqual({
          statusCode: 400,
          message: 'Validation failed',
          error: 'Bad Request',
          details: [{ field: 'email', message: 'Invalid email format' }],
        });
      });
  });

  it('/test-error/unauthorized (GET)', () => {
    return request(app.getHttpServer()).get('/test-error/unauthorized').expect(401, {
      statusCode: 401,
      message: 'Authentication required',
      error: 'Unauthorized',
    });
  });
});
