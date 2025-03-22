import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseModule } from '../src/courses/entities/course-module.entity';
import { Course } from '../src/courses/entities/course.entity';
import { User } from '../src/users/entities/user.entity';
import { Category } from '../src/courses/entities/category.entity';
import { Tag } from '../src/courses/entities/tag.entity';
import { CourseReview } from '../src/courses/entities/course-review.entity';
import { Certificate } from '../src/certificate/entity/certificate.entity';
import { Payment } from '../src/payment/entities/payment.entity';
import { UserProgress } from '../src/users/entities/user-progress.entity';
import { Lesson } from '../src/lesson/entity/lesson.entity';
import { ForumPost } from '../src/forum/entities/forum-post.entity';
import { ForumComment } from '../src/forum/entities/forum-comment.entity';
import { ForumTopic } from '../src/forum/entities/forum-topic.entity';
import { ForumCategory } from '../src/forum/entities/forum-category.entity';
import { Notification } from '../src/notification/entities/notification.entity';
import { AuthToken } from '../src/auth/entities/auth-token.entity';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ConfigService)
      .useValue({
        get: jest.fn().mockImplementation((key: string) => {
          switch (key) {
            case 'DB_HOST':
              return 'localhost';
            case 'DB_PORT':
              return 5432;
            case 'DB_USER':
              return 'postgres';
            case 'DB_PASSWORD':
              return 'postgres';
            case 'DB_NAME':
              return 'postgres';
            case 'JWT_SECRET':
              return 'test-secret';
            case 'STELLAR_NETWORK':
              return 'testnet';
            default:
              return null;
          }
        }),
      })
      .overrideModule(TypeOrmModule)
      .useModule(TypeOrmModule.forRoot({
        type: 'postgres',
        host: 'localhost',
        port: 5432,
        username: 'postgres',
        password: 'postgres',
        database: 'postgres',
        entities: [
          CourseModule,
          Course,
          User,
          Category,
          Tag,
          CourseReview,
          Certificate,
          Payment,
          UserProgress,
          Lesson,
          ForumPost,
          ForumComment,
          ForumTopic,
          ForumCategory,
          Notification,
          AuthToken
        ],
        synchronize: true,
        autoLoadEntities: true,
        logging: true,
        retryAttempts: 3,
        retryDelay: 1000
      }))
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  }, 60000); // Increase timeout to 60 seconds

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });
});
