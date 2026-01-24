import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AppModule } from '../../src/app.module';
import { User } from '../../src/users/entities/user.entity';
import { Course } from '../../src/courses/entities/course.entity';
import { DatabaseTestModule } from '../utils/database-test.module';
describe('Payment Processing Integration Tests', () => {
    let app;
    let moduleRef;
    let userRepository;
    let courseRepository;
    let testStudent;
    let testInstructor;
    let studentToken;
    let instructorToken;
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
        userRepository = moduleRef.get(getRepositoryToken(User));
        courseRepository = moduleRef.get(getRepositoryToken(Course));
    });
    afterAll(async () => {
        await app.close();
    });
    beforeEach(async () => {
        // Clean database before each test
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
        testStudent = await userRepository.findOne({
            where: { email: 'student@example.com' },
        });
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
        testInstructor = await userRepository.findOne({
            where: { email: 'instructor@example.com' },
        });
        instructorToken = instructorResponse.body.access_token;
    }
    async function createTestCourse(overrides = {}) {
        const courseData = {
            title: 'Payment Test Course',
            description: 'A course for testing payment processing',
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
    describe('Course Purchase Payment Flow', () => {
        it('should complete full course purchase flow with card payment', async () => {
            const course = await createTestCourse({
                title: 'Premium Course',
                price: 149.99,
            });
            // Step 1: Create payment for course purchase
            const paymentResponse = await request(app.getHttpServer())
                .post('/payments/course-purchase')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                courseId: course.id,
                amount: 14999, // Amount in cents
                currency: 'USD',
                paymentMethodId: 'pm_card_visa',
                customerEmail: testStudent.email,
                customerName: `${testStudent.firstName} ${testStudent.lastName}`,
            })
                .expect(201);
            expect(paymentResponse.body).toMatchObject({
                id: expect.any(String),
                userId: testStudent.id,
                courseId: course.id,
                amount: 14999,
                currency: 'USD',
            });
            const paymentId = paymentResponse.body.id;
            // Step 2: Process the payment
            const processResponse = await request(app.getHttpServer())
                .post(`/payments/${paymentId}/process`)
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                paymentMethodId: 'pm_card_visa',
                confirm: true,
            })
                .expect(200);
            expect(processResponse.body).toMatchObject({
                id: paymentId,
                status: 'completed',
                completedAt: expect.any(String),
            });
        });
        it('should handle payment failure gracefully', async () => {
            const course = await createTestCourse({
                title: 'Failed Payment Course',
                price: 99.99,
            });
            // Create payment
            const paymentResponse = await request(app.getHttpServer())
                .post('/payments/course-purchase')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                courseId: course.id,
                amount: 9999,
                currency: 'USD',
                paymentMethodId: 'pm_card_visa_chargeDeclined',
            })
                .expect(201);
            const paymentId = paymentResponse.body.id;
            // Attempt to process payment (should fail)
            const processResponse = await request(app.getHttpServer())
                .post(`/payments/${paymentId}/process`)
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                paymentMethodId: 'pm_card_visa_chargeDeclined',
                confirm: true,
            })
                .expect(400);
            expect(processResponse.body.message).toContain('failed');
        });
        it('should handle payment with discount coupon', async () => {
            const course = await createTestCourse({
                title: 'Discounted Course',
                price: 200.00,
            });
            const originalAmount = 20000; // $200 in cents
            const discountAmount = 5000; // $50 discount
            const finalAmount = originalAmount - discountAmount;
            const paymentResponse = await request(app.getHttpServer())
                .post('/payments/course-purchase')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                courseId: course.id,
                amount: finalAmount,
                currency: 'USD',
                paymentMethodId: 'pm_card_visa',
                couponCode: 'SAVE50',
                discountAmount: discountAmount,
            })
                .expect(201);
            expect(paymentResponse.body).toMatchObject({
                amount: finalAmount,
                discountAmount: discountAmount,
                couponCode: 'SAVE50',
            });
        });
        it('should handle international payments with currency conversion', async () => {
            const course = await createTestCourse({
                title: 'International Course',
                price: 99.99,
                currency: 'EUR',
            });
            const paymentResponse = await request(app.getHttpServer())
                .post('/payments/course-purchase')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                courseId: course.id,
                amount: 9999, // €99.99 in cents
                currency: 'EUR',
                paymentMethodId: 'pm_card_visa',
                billingAddress: 'Berlin, Germany',
            })
                .expect(201);
            expect(paymentResponse.body).toMatchObject({
                currency: 'EUR',
                billingAddress: 'Berlin, Germany',
            });
        });
    });
    describe('Payment Security and Validation', () => {
        it('should prevent duplicate payments for same course', async () => {
            const course = await createTestCourse({
                title: 'Duplicate Prevention Course',
                price: 99.99,
            });
            // First payment
            const firstPaymentResponse = await request(app.getHttpServer())
                .post('/payments/course-purchase')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                courseId: course.id,
                amount: 9999,
                currency: 'USD',
                paymentMethodId: 'pm_card_visa',
            })
                .expect(201);
            // Process first payment
            await request(app.getHttpServer())
                .post(`/payments/${firstPaymentResponse.body.id}/process`)
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                paymentMethodId: 'pm_card_visa',
                confirm: true,
            })
                .expect(200);
            // Attempt second payment for same course
            const duplicateResponse = await request(app.getHttpServer())
                .post('/payments/course-purchase')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                courseId: course.id,
                amount: 9999,
                currency: 'USD',
                paymentMethodId: 'pm_card_visa',
            })
                .expect(400);
            expect(duplicateResponse.body.message).toContain('already purchased');
        });
        it('should validate payment amounts against course price', async () => {
            const course = await createTestCourse({
                title: 'Price Validation Course',
                price: 199.99,
            });
            // Attempt payment with incorrect amount
            const invalidPaymentResponse = await request(app.getHttpServer())
                .post('/payments/course-purchase')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                courseId: course.id,
                amount: 5000, // $50 instead of $199.99
                currency: 'USD',
                paymentMethodId: 'pm_card_visa',
            })
                .expect(400);
            expect(invalidPaymentResponse.body.message).toContain('amount mismatch');
        });
    });
    describe('Payment Analytics and Reporting', () => {
        it('should generate payment analytics for instructors', async () => {
            // Create a course first
            const course = await createTestCourse({
                title: 'Analytics Course',
                price: 100.00,
            });
            // Create a payment
            const paymentResponse = await request(app.getHttpServer())
                .post('/payments/course-purchase')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                courseId: course.id,
                amount: 10000,
                currency: 'USD',
                paymentMethodId: 'pm_card_visa',
            })
                .expect(201);
            // Process payment
            await request(app.getHttpServer())
                .post(`/payments/${paymentResponse.body.id}/process`)
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                paymentMethodId: 'pm_card_visa',
                confirm: true,
            })
                .expect(200);
            // Get analytics
            const analyticsResponse = await request(app.getHttpServer())
                .get('/payments/analytics/instructor')
                .set('Authorization', `Bearer ${instructorToken}`)
                .query({
                startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                endDate: new Date().toISOString(),
            })
                .expect(200);
            expect(analyticsResponse.body).toMatchObject({
                totalRevenue: expect.any(Number),
                totalTransactions: expect.any(Number),
            });
        });
        it('should provide payment history for users', async () => {
            const historyResponse = await request(app.getHttpServer())
                .get('/payments/my-payments')
                .set('Authorization', `Bearer ${studentToken}`)
                .query({
                page: 1,
                limit: 10,
                status: 'completed',
            })
                .expect(200);
            expect(historyResponse.body).toMatchObject({
                payments: expect.any(Array),
                pagination: expect.any(Object),
            });
        });
    });
    describe('Refund Processing', () => {
        it('should process refund request', async () => {
            const course = await createTestCourse({
                title: 'Refundable Course',
                price: 99.99,
            });
            // Create and complete a payment
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
            await request(app.getHttpServer())
                .post(`/payments/${paymentResponse.body.id}/process`)
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                paymentMethodId: 'pm_card_visa',
                confirm: true,
            })
                .expect(200);
            // Request refund
            const refundResponse = await request(app.getHttpServer())
                .post(`/payments/${paymentResponse.body.id}/refund`)
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                reason: 'Not satisfied with course quality',
                amount: 9999,
            })
                .expect(200);
            expect(refundResponse.body).toMatchObject({
                refundId: expect.any(String),
                amount: 9999,
                status: 'processing',
                reason: 'Not satisfied with course quality',
            });
        });
    });
});
