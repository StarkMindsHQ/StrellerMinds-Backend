import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

import { AppModule } from '../../src/app.module';
import { User } from '../../src/users/entities/user.entity';
import { Course } from '../../src/courses/entities/course.entity';
import { DatabaseTestModule } from '../utils/database-test.module';

describe('Course Enrollment Integration Tests', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let userRepository: Repository<User>;
  let courseRepository: Repository<Course>;

  let testStudent: User;
  let testInstructor: User;
  let studentToken: string;
  let instructorToken: string;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        DatabaseTestModule,
        TypeOrmModule.forFeature([User, Course]),
        AppModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    userRepository = moduleRef.get<Repository<User>>(getRepositoryToken(User));
    courseRepository = moduleRef.get<Repository<Course>>(getRepositoryToken(Course));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await courseRepository.clear();
    await userRepository.clear();

    await setupTestUsers();
  });

  async function setupTestUsers() {
    // Create student
    const studentResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'student@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Student',
        role: 'student',
      })
      .expect(201);

    testStudent = (await userRepository.findOne({
      where: { email: 'student@example.com' },
    })) as User;
    studentToken = studentResponse.body.access_token;

    // Create instructor
    const instructorResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'instructor@example.com',
        password: 'SecurePass123!',
        firstName: 'Jane',
        lastName: 'Instructor',
        role: 'instructor',
      })
      .expect(201);

    testInstructor = (await userRepository.findOne({
      where: { email: 'instructor@example.com' },
    })) as User;
    instructorToken = instructorResponse.body.access_token;
  }

  async function createTestCourse(overrides = {}) {
    const courseData = {
      title: 'Test Course',
      description: 'A course for testing enrollment',
      instructorId: testInstructor.id,
      price: 99.99,
      currency: 'USD',
      level: 'beginner',
      category: 'programming',
      duration: 40,
      tags: ['javascript', 'web-development'],
      isPublished: true,
      ...overrides,
    };

    const response = await request(app.getHttpServer())
      .post('/courses')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send(courseData)
      .expect(201);

    return response.body;
  }

  describe('Course Enrollment Flow', () => {
    it('should complete full enrollment flow for free course', async () => {
      const course = await createTestCourse({
        title: 'Free Course',
        price: 0,
        isPublished: true,
      });

      // Step 1: Enroll in course
      const enrollmentResponse = await request(app.getHttpServer())
        .post('/enrollment/enroll')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          courseId: course.id,
        })
        .expect(201);

      expect(enrollmentResponse.body).toMatchObject({
        id: expect.any(String),
        studentId: testStudent.id,
        courseId: course.id,
        status: 'enrolled',
        enrolledAt: expect.any(String),
      });

      // Step 2: Verify enrollment in database
      const enrollment = await request(app.getHttpServer())
        .get(`/enrollment/my-enrollments`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(enrollment.body.enrollments).toHaveLength(1);
      expect(enrollment.body.enrollments[0]).toMatchObject({
        courseId: course.id,
        status: 'enrolled',
      });
    });

    it('should complete enrollment flow for paid course with payment', async () => {
      const course = await createTestCourse({
        title: 'Paid Course',
        price: 99.99,
        isPublished: true,
      });

      // Step 1: Create payment
      const paymentResponse = await request(app.getHttpServer())
        .post('/payments/course-purchase')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          courseId: course.id,
          amount: 9999,
          currency: 'USD',
          paymentMethodId: 'pm_card_visa',
        })
        .expect(201);

      // Step 2: Process payment
      await request(app.getHttpServer())
        .post(`/payments/${paymentResponse.body.id}/process`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          paymentMethodId: 'pm_card_visa',
          confirm: true,
        })
        .expect(200);

      // Step 3: Verify enrollment was created automatically
      const enrollment = await request(app.getHttpServer())
        .get(`/enrollment/my-enrollments`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(enrollment.body.enrollments).toHaveLength(1);
      expect(enrollment.body.enrollments[0]).toMatchObject({
        courseId: course.id,
        status: 'enrolled',
        paymentStatus: 'paid',
      });
    });

    it('should handle enrollment with prerequisites', async () => {
      // Create prerequisite course
      const prerequisiteCourse = await createTestCourse({
        title: 'Prerequisite Course',
        price: 0,
        isPublished: true,
      });

      // Create main course with prerequisite
      const mainCourse = await createTestCourse({
        title: 'Advanced Course',
        price: 0,
        isPublished: true,
        prerequisites: [prerequisiteCourse.id],
      });

      // Try to enroll without completing prerequisite
      const enrollmentResponse = await request(app.getHttpServer())
        .post('/enrollment/enroll')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          courseId: mainCourse.id,
        })
        .expect(400);

      expect(enrollmentResponse.body.message).toContain('prerequisite');

      // Complete prerequisite first
      await request(app.getHttpServer())
        .post('/enrollment/enroll')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          courseId: prerequisiteCourse.id,
        })
        .expect(201);

      // Mark prerequisite as completed
      await request(app.getHttpServer())
        .post(`/enrollment/${prerequisiteCourse.id}/complete`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      // Now enroll in main course
      await request(app.getHttpServer())
        .post('/enrollment/enroll')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          courseId: mainCourse.id,
        })
        .expect(201);
    });

    it('should handle course capacity limits', async () => {
      const course = await createTestCourse({
        title: 'Limited Capacity Course',
        price: 0,
        isPublished: true,
        maxStudents: 2,
      });

      // Create additional students
      const student2Response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'student2@example.com',
          password: 'SecurePass123!',
          firstName: 'Student',
          lastName: 'Two',
          role: 'student',
        })
        .expect(201);

      const student3Response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'student3@example.com',
          password: 'SecurePass123!',
          firstName: 'Student',
          lastName: 'Three',
          role: 'student',
        })
        .expect(201);

      // First two enrollments should succeed
      await request(app.getHttpServer())
        .post('/enrollment/enroll')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          courseId: course.id,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/enrollment/enroll')
        .set('Authorization', `Bearer ${student2Response.body.access_token}`)
        .send({
          courseId: course.id,
        })
        .expect(201);

      // Third enrollment should fail
      const thirdEnrollmentResponse = await request(app.getHttpServer())
        .post('/enrollment/enroll')
        .set('Authorization', `Bearer ${student3Response.body.access_token}`)
        .send({
          courseId: course.id,
        })
        .expect(400);

      expect(thirdEnrollmentResponse.body.message).toContain('capacity');
    });
  });

  describe('Course Progress Tracking', () => {
    it('should track course progress', async () => {
      const course = await createTestCourse({
        title: 'Progress Tracking Course',
        price: 0,
        isPublished: true,
      });

      // Enroll in course
      await request(app.getHttpServer())
        .post('/enrollment/enroll')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          courseId: course.id,
        })
        .expect(201);

      // Update progress
      const progressResponse = await request(app.getHttpServer())
        .post(`/enrollment/${course.id}/progress`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          progress: 50,
          completedLessons: ['lesson1', 'lesson2'],
        })
        .expect(200);

      expect(progressResponse.body).toMatchObject({
        courseId: course.id,
        studentId: testStudent.id,
        progress: 50,
        completedLessons: ['lesson1', 'lesson2'],
      });

      // Get progress
      const getProgressResponse = await request(app.getHttpServer())
        .get(`/enrollment/${course.id}/progress`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(getProgressResponse.body.progress).toBe(50);
    });

    it('should complete course when all lessons are finished', async () => {
      const course = await createTestCourse({
        title: 'Completable Course',
        price: 0,
        isPublished: true,
        totalLessons: 2,
      });

      // Enroll in course
      await request(app.getHttpServer())
        .post('/enrollment/enroll')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          courseId: course.id,
        })
        .expect(201);

      // Complete all lessons
      await request(app.getHttpServer())
        .post(`/enrollment/${course.id}/progress`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          progress: 100,
          completedLessons: ['lesson1', 'lesson2'],
        })
        .expect(200);

      // Mark course as completed
      const completionResponse = await request(app.getHttpServer())
        .post(`/enrollment/${course.id}/complete`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(completionResponse.body).toMatchObject({
        courseId: course.id,
        studentId: testStudent.id,
        status: 'completed',
        completedAt: expect.any(String),
      });
    });
  });

  describe('Enrollment Management', () => {
    it('should allow students to unenroll from course', async () => {
      const course = await createTestCourse({
        title: 'Unenrollable Course',
        price: 0,
        isPublished: true,
      });

      // Enroll in course
      await request(app.getHttpServer())
        .post('/enrollment/enroll')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          courseId: course.id,
        })
        .expect(201);

      // Unenroll from course
      const unenrollResponse = await request(app.getHttpServer())
        .delete(`/enrollment/${course.id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(unenrollResponse.body).toMatchObject({
        message: 'Successfully unenrolled from course',
        courseId: course.id,
      });

      // Verify enrollment is removed
      const enrollments = await request(app.getHttpServer())
        .get(`/enrollment/my-enrollments`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(enrollments.body.enrollments).toHaveLength(0);
    });

    it('should provide enrollment statistics for instructors', async () => {
      const course = await createTestCourse({
        title: 'Statistics Course',
        price: 0,
        isPublished: true,
      });

      // Enroll multiple students
      const student2Response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'student2@example.com',
          password: 'SecurePass123!',
          firstName: 'Student',
          lastName: 'Two',
          role: 'student',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/enrollment/enroll')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          courseId: course.id,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/enrollment/enroll')
        .set('Authorization', `Bearer ${student2Response.body.access_token}`)
        .send({
          courseId: course.id,
        })
        .expect(201);

      // Get enrollment statistics
      const statsResponse = await request(app.getHttpServer())
        .get(`/enrollment/course/${course.id}/stats`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .expect(200);

      expect(statsResponse.body).toMatchObject({
        courseId: course.id,
        totalEnrollments: 2,
        activeEnrollments: 2,
        completedEnrollments: 0,
      });
    });
  });
});
