import { Test } from '@nestjs/testing';
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
import { ForumPost } from '../src/post/entities/forum-post.entity';
import { ForumComment } from '../src/forum/entities/forum-comment.entity';
import { ForumTopic } from '../src/topic/entities/forum-topic.entity';
import { ForumCategory } from '../src/catogory/entities/forum-category.entity';
import { Notification } from '../src/notification/entities/notification.entity';
import { AuthToken } from '../src/auth/entities/auth-token.entity';
describe('AppController (e2e)', () => {
    let app;
    beforeEach(async () => {
        const moduleFixture = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider(ConfigService)
            .useValue({
            get: jest.fn().mockImplementation((key) => {
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
                AuthToken,
            ],
            synchronize: true,
            autoLoadEntities: true,
            logging: true,
            retryAttempts: 3,
            retryDelay: 1000,
        }))
            .compile();
        app = moduleFixture.createNestApplication();
        await app.init();
    }, 60000); // 1 minute timeout for the beforeEach to allow for database connection
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
let app;
beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
        imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
});
afterAll(async () => {
    await app.close();
});
describe('Courses (e2e)', () => {
    it('/courses (POST)', async () => {
        const getAdminToken = async () => {
            // Mock implementation of getAdminToken
            return 'mocked-admin-token';
        };
        const token = await getAdminToken();
        const courseDto = {
            title: 'Intro to Stellar',
            description: 'Learn Stellar basics',
            difficulty: 'beginner',
            modules: [
                {
                    title: 'Module 1',
                    lessons: [
                        { title: 'Lesson 1', content: 'Stellar overview' },
                        { title: 'Lesson 2', content: 'Accounts' }
                    ]
                }
            ]
        };
        const response = await request(app.getHttpServer())
            .post('/courses')
            .set('Authorization', `Bearer ${token}`)
            .send(courseDto)
            .expect(201);
        expect(response.body.title).toBe('Intro to Stellar');
    });
});
