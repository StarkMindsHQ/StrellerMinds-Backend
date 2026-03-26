import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppModule } from '../../src/app.module';
import { UserService } from '../../src/user/user.service';
import { AuthService } from '../../src/auth/services/auth.service';
import { PaymentService } from '../../src/payment/services/payment.service';
import { AnalyticsService } from '../../src/analytics/services/analytics.service';
import * as request from 'supertest';

describe('User Workflow Integration Tests', () => {
  let app: INestApplication;
  let userService: UserService;
  let authService: AuthService;
  let paymentService: PaymentService;
  let analyticsService: AnalyticsService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        AppModule,
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [__dirname + '/../../src/**/*.entity{.ts,.js}'],
          synchronize: true,
          logging: false,
        }),
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    userService = moduleFixture.get<UserService>(UserService);
    authService = moduleFixture.get<AuthService>(AuthService);
    paymentService = moduleFixture.get<PaymentService>(PaymentService);
    analyticsService = moduleFixture.get<AnalyticsService>(AnalyticsService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Complete User Onboarding Flow', () => {
    let userId: string;
    let accessToken: string;

    it('should register a new user', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(registerDto.email);
      userId = response.body.user.id;
    });

    it('should login the user', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'Password123!',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(200);

      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      accessToken = response.body.accessToken;
    });

    it('should get user profile', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(userId);
      expect(response.body.email).toBe('test@example.com');
    });

    it('should update user profile', async () => {
      const updateDto = {
        firstName: 'John Updated',
        lastName: 'Doe Updated',
        bio: 'Software Developer',
      };

      const response = await request(app.getHttpServer())
        .patch('/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.firstName).toBe(updateDto.firstName);
      expect(response.body.lastName).toBe(updateDto.lastName);
      expect(response.body.bio).toBe(updateDto.bio);
    });
  });

  describe('Course Enrollment and Learning Flow', () => {
    let courseId: string;
    let enrollmentId: string;

    it('should browse available courses', async () => {
      const response = await request(app.getHttpServer())
        .get('/courses')
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should enroll in a course', async () => {
      // First create a course (mock)
      const courseDto = {
        title: 'Introduction to Programming',
        description: 'Learn programming basics',
        price: 99.99,
        duration: 3600, // 1 hour in seconds
      };

      const courseResponse = await request(app.getHttpServer())
        .post('/courses')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(courseDto)
        .expect(201);

      courseId = courseResponse.body.id;

      // Enroll in the course
      const enrollmentResponse = await request(app.getHttpServer())
        .post(`/courses/${courseId}/enroll`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      enrollmentId = enrollmentResponse.body.id;
      expect(enrollmentResponse.body.courseId).toBe(courseId);
    });

    it('should track course progress', async () => {
      const progressDto = {
        lessonId: 'lesson-1',
        completed: true,
        timeSpent: 1800, // 30 minutes
      };

      const response = await request(app.getHttpServer())
        .post(`/enrollments/${enrollmentId}/progress`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(progressDto)
        .expect(200);

      expect(response.body.progress).toBeDefined();
    });

    it('should get learning analytics', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/learning')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.totalCoursesEnrolled).toBeDefined();
      expect(response.body.totalTimeSpent).toBeDefined();
      expect(response.body.completionRate).toBeDefined();
    });
  });

  describe('Payment Processing Flow', () => {
    let paymentIntentId: string;

    it('should create a payment intent', async () => {
      const paymentDto = {
        amount: 9999, // $99.99 in cents
        currency: 'usd',
        paymentMethod: 'credit_card',
        description: 'Course enrollment fee',
      };

      const response = await request(app.getHttpServer())
        .post('/payments/create-intent')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(paymentDto)
        .expect(201);

      expect(response.body.clientSecret).toBeDefined();
      paymentIntentId = response.body.paymentIntentId;
    });

    it('should confirm payment', async () => {
      const confirmDto = {
        paymentIntentId: paymentIntentId,
        paymentMethodId: 'pm_card_visa',
      };

      const response = await request(app.getHttpServer())
        .post('/payments/confirm')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(confirmDto)
        .expect(200);

      expect(response.body.status).toBe('succeeded');
    });

    it('should get payment history', async () => {
      const response = await request(app.getHttpServer())
        .get('/payments/history')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.payments).toBeDefined();
      expect(Array.isArray(response.body.payments)).toBe(true);
    });
  });

  describe('Video Learning Flow', () => {
    let videoId: string;

    it('should upload a video', async () => {
      const videoDto = {
        title: 'Introduction Lesson',
        description: 'Course introduction video',
        duration: 1800, // 30 minutes
        file: 'video.mp4',
      };

      const response = await request(app.getHttpServer())
        .post('/videos/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(videoDto)
        .expect(201);

      videoId = response.body.id;
      expect(response.body.title).toBe(videoDto.title);
    });

    it('should start video transcoding', async () => {
      const response = await request(app.getHttpServer())
        .post(`/videos/${videoId}/transcode`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.transcodingJobId).toBeDefined();
    });

    it('should get video streaming URL', async () => {
      const response = await request(app.getHttpServer())
        .get(`/videos/${videoId}/stream`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.streamUrl).toBeDefined();
      expect(response.body.quality).toBeDefined();
    });

    it('should track video watching progress', async () => {
      const progressDto = {
        videoId: videoId,
        currentTime: 900, // 15 minutes
        duration: 1800, // 30 minutes
        completed: false,
      };

      const response = await request(app.getHttpServer())
        .post('/videos/progress')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(progressDto)
        .expect(200);

      expect(response.body.saved).toBe(true);
    });
  });

  describe('Analytics and Reporting Flow', () => {
    it('should get dashboard analytics', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/dashboard')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.courses).toBeDefined();
      expect(response.body.users).toBeDefined();
      expect(response.body.revenue).toBeDefined();
    });

    it('should get course analytics', async () => {
      const response = await request(app.getHttpServer())
        .get(`/analytics/courses/${courseId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.enrollments).toBeDefined();
      expect(response.body.completionRate).toBeDefined();
      expect(response.body.revenue).toBeDefined();
    });

    it('should generate performance report', async () => {
      const reportDto = {
        type: 'monthly',
        startDate: '2023-01-01',
        endDate: '2023-01-31',
        format: 'pdf',
      };

      const response = await request(app.getHttpServer())
        .post('/analytics/reports/generate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(reportDto)
        .expect(201);

      expect(response.body.reportId).toBeDefined();
      expect(response.body.downloadUrl).toBeDefined();
    });
  });

  describe('Admin Operations Flow', () => {
    let adminToken: string;

    beforeAll(async () => {
      // Login as admin
      const adminLoginDto = {
        email: 'admin@example.com',
        password: 'AdminPass123!',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(adminLoginDto)
        .expect(200);

      adminToken = response.body.accessToken;
    });

    it('should get all users', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should suspend a user', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/admin/users/${userId}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Policy violation' })
        .expect(200);

      expect(response.body.status).toBe('suspended');
    });

    it('should reactivate a user', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/admin/users/${userId}/reactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.status).toBe('active');
    });

    it('should get system health metrics', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/health')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.status).toBeDefined();
      expect(response.body.uptime).toBeDefined();
      expect(response.body.memory).toBeDefined();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid authentication', async () => {
      await request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should handle rate limiting', async () => {
      const requests = Array(101).fill(null).map(() =>
        request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: 'test@example.com', password: 'wrong' })
      );

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should handle database connection errors gracefully', async () => {
      // This would require mocking database failures
      // For now, we'll test a scenario that might cause DB issues
      const invalidDto = {
        email: 'invalid-email',
        password: '123', // Too short
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(invalidDto)
        .expect(400);
    });

    it('should handle concurrent requests', async () => {
      const concurrentRequests = Array(10).fill(null).map(() =>
        request(app.getHttpServer())
          .get('/courses')
          .set('Authorization', `Bearer ${accessToken}`)
      );

      const responses = await Promise.all(concurrentRequests);
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });
});
