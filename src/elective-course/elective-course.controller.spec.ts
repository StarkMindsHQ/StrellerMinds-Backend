import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as request from 'supertest';
import { ElectiveCourseController } from './elective-course.controller';
import { ElectiveCourseService } from './elective-course.service';
import { ElectiveCourse } from './entities/elective-course.entity';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

describe('ElectiveCourseController (integration)', () => {
  let app: INestApplication;

  const mockAuthGuard = {
    canActivate: () => true,
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [ElectiveCourse],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([ElectiveCourse]),
      ],
      controllers: [ElectiveCourseController],
      providers: [ElectiveCourseService],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /elective-courses -> create course (protected)', async () => {
    const payload = { title: 'Test Course', description: 'desc', creditHours: 3 };
    const res = await request(app.getHttpServer())
      .post('/elective-courses')
      .send(payload)
      .expect(201);

    expect(res.body).toHaveProperty('status', 'success');
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.title).toBe('Test Course');
  });

  it('GET /elective-courses -> list courses (public)', async () => {
    const res = await request(app.getHttpServer()).get('/elective-courses').expect(200);
    expect(res.body).toHaveProperty('status', 'success');
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /elective-courses/:id -> get single course (public)', async () => {
    // create first
    const create = await request(app.getHttpServer())
      .post('/elective-courses')
      .send({ title: 'Single', creditHours: 2 })
      .expect(201);

    const id = create.body.data.id;
    const res = await request(app.getHttpServer()).get(`/elective-courses/${id}`).expect(200);
    expect(res.body.data.id).toBe(id);
    expect(res.body.data.title).toBe('Single');
  });

  it('PATCH /elective-courses/:id -> update course (protected)', async () => {
    const create = await request(app.getHttpServer())
      .post('/elective-courses')
      .send({ title: 'ToUpdate', creditHours: 4 })
      .expect(201);
    const id = create.body.data.id;

    const res = await request(app.getHttpServer())
      .patch(`/elective-courses/${id}`)
      .send({ title: 'Updated' })
      .expect(200);

    expect(res.body.data.title).toBe('Updated');
  });

  it('DELETE /elective-courses/:id -> delete course (protected)', async () => {
    const create = await request(app.getHttpServer())
      .post('/elective-courses')
      .send({ title: 'ToDelete', creditHours: 1 })
      .expect(201);
    const id = create.body.data.id;

    await request(app.getHttpServer()).delete(`/elective-courses/${id}`).expect(200);

    // confirm deleted
    await request(app.getHttpServer()).get(`/elective-courses/${id}`).expect(404);
  });
});
