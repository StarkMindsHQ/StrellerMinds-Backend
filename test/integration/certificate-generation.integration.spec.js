import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AppModule } from '../../src/app.module';
import { User } from '../../src/users/entities/user.entity';
import { Course } from '../../src/courses/entities/course.entity';
import { DatabaseTestModule } from '../utils/database-test.module';
describe('Certificate Generation Integration Tests', () => {
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
            title: 'Certificate Course',
            description: 'A course that issues certificates',
            instructorId: testInstructor.id,
            price: 0,
            currency: 'USD',
            level: 'beginner',
            category: 'programming',
            duration: 40,
            tags: ['javascript', 'certification'],
            isPublished: true,
            issuesCertificate: true,
            ...overrides,
        };
        const response = await request(app.getHttpServer())
            .post('/courses')
            .set('Authorization', `Bearer ${instructorToken}`)
            .send(courseData)
            .expect(201);
        return response.body;
    }
    describe('Certificate Generation Flow', () => {
        it('should generate certificate upon course completion', async () => {
            const course = await createTestCourse({
                title: 'Certificate Course',
                issuesCertificate: true,
            });
            // Enroll in course
            await request(app.getHttpServer())
                .post('/enrollment/enroll')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                courseId: course.id,
            })
                .expect(201);
            // Complete course
            await request(app.getHttpServer())
                .post(`/enrollment/${course.id}/complete`)
                .set('Authorization', `Bearer ${studentToken}`)
                .expect(200);
            // Generate certificate
            const certificateResponse = await request(app.getHttpServer())
                .post('/certificates/generate')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                courseId: course.id,
                studentId: testStudent.id,
            })
                .expect(201);
            expect(certificateResponse.body).toMatchObject({
                id: expect.any(String),
                studentId: testStudent.id,
                courseId: course.id,
                certificateNumber: expect.any(String),
                issuedAt: expect.any(String),
                status: 'issued',
            });
            // Verify certificate has unique number
            expect(certificateResponse.body.certificateNumber).toMatch(/^CERT-\d{8}-\w{6}$/);
        });
        it('should generate certificate with QR code', async () => {
            const course = await createTestCourse({
                title: 'QR Certificate Course',
                issuesCertificate: true,
            });
            // Complete course and generate certificate
            await request(app.getHttpServer())
                .post('/enrollment/enroll')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                courseId: course.id,
            })
                .expect(201);
            await request(app.getHttpServer())
                .post(`/enrollment/${course.id}/complete`)
                .set('Authorization', `Bearer ${studentToken}`)
                .expect(200);
            const certificateResponse = await request(app.getHttpServer())
                .post('/certificates/generate')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                courseId: course.id,
                studentId: testStudent.id,
                includeQRCode: true,
            })
                .expect(201);
            expect(certificateResponse.body).toMatchObject({
                qrCode: expect.any(String),
                verificationUrl: expect.any(String),
            });
            // Verify QR code is base64 encoded
            expect(certificateResponse.body.qrCode).toMatch(/^data:image\/png;base64,/);
        });
        it('should verify certificate authenticity', async () => {
            const course = await createTestCourse({
                title: 'Verifiable Certificate Course',
                issuesCertificate: true,
            });
            // Complete course and generate certificate
            await request(app.getHttpServer())
                .post('/enrollment/enroll')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                courseId: course.id,
            })
                .expect(201);
            await request(app.getHttpServer())
                .post(`/enrollment/${course.id}/complete`)
                .set('Authorization', `Bearer ${studentToken}`)
                .expect(200);
            const certificateResponse = await request(app.getHttpServer())
                .post('/certificates/generate')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                courseId: course.id,
                studentId: testStudent.id,
            })
                .expect(201);
            const certificateId = certificateResponse.body.id;
            // Verify certificate
            const verificationResponse = await request(app.getHttpServer())
                .get(`/certificates/${certificateId}/verify`)
                .expect(200);
            expect(verificationResponse.body).toMatchObject({
                valid: true,
                certificate: {
                    id: certificateId,
                    studentId: testStudent.id,
                    courseId: course.id,
                    status: 'issued',
                },
            });
        });
        it('should handle certificate sharing', async () => {
            const course = await createTestCourse({
                title: 'Shareable Certificate Course',
                issuesCertificate: true,
            });
            // Complete course and generate certificate
            await request(app.getHttpServer())
                .post('/enrollment/enroll')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                courseId: course.id,
            })
                .expect(201);
            await request(app.getHttpServer())
                .post(`/enrollment/${course.id}/complete`)
                .set('Authorization', `Bearer ${studentToken}`)
                .expect(200);
            const certificateResponse = await request(app.getHttpServer())
                .post('/certificates/generate')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                courseId: course.id,
                studentId: testStudent.id,
            })
                .expect(201);
            const certificateId = certificateResponse.body.id;
            // Share certificate
            const shareResponse = await request(app.getHttpServer())
                .post(`/certificates/${certificateId}/share`)
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                platform: 'linkedin',
                message: 'I just completed this course!',
            })
                .expect(200);
            expect(shareResponse.body).toMatchObject({
                shareUrl: expect.any(String),
                platform: 'linkedin',
                sharedAt: expect.any(String),
            });
        });
    });
    describe('Certificate Management', () => {
        it('should list student certificates', async () => {
            const course1 = await createTestCourse({
                title: 'Course 1',
                issuesCertificate: true,
            });
            const course2 = await createTestCourse({
                title: 'Course 2',
                issuesCertificate: true,
            });
            // Complete both courses and generate certificates
            for (const course of [course1, course2]) {
                await request(app.getHttpServer())
                    .post('/enrollment/enroll')
                    .set('Authorization', `Bearer ${studentToken}`)
                    .send({
                    courseId: course.id,
                })
                    .expect(201);
                await request(app.getHttpServer())
                    .post(`/enrollment/${course.id}/complete`)
                    .set('Authorization', `Bearer ${studentToken}`)
                    .expect(200);
                await request(app.getHttpServer())
                    .post('/certificates/generate')
                    .set('Authorization', `Bearer ${studentToken}`)
                    .send({
                    courseId: course.id,
                    studentId: testStudent.id,
                })
                    .expect(201);
            }
            // Get student certificates
            const certificatesResponse = await request(app.getHttpServer())
                .get('/certificates/my-certificates')
                .set('Authorization', `Bearer ${studentToken}`)
                .expect(200);
            expect(certificatesResponse.body.certificates).toHaveLength(2);
            expect(certificatesResponse.body.certificates[0]).toMatchObject({
                studentId: testStudent.id,
                status: 'issued',
            });
        });
        it('should download certificate as PDF', async () => {
            const course = await createTestCourse({
                title: 'PDF Certificate Course',
                issuesCertificate: true,
            });
            // Complete course and generate certificate
            await request(app.getHttpServer())
                .post('/enrollment/enroll')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                courseId: course.id,
            })
                .expect(201);
            await request(app.getHttpServer())
                .post(`/enrollment/${course.id}/complete`)
                .set('Authorization', `Bearer ${studentToken}`)
                .expect(200);
            const certificateResponse = await request(app.getHttpServer())
                .post('/certificates/generate')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                courseId: course.id,
                studentId: testStudent.id,
            })
                .expect(201);
            const certificateId = certificateResponse.body.id;
            // Download certificate as PDF
            const downloadResponse = await request(app.getHttpServer())
                .get(`/certificates/${certificateId}/download`)
                .set('Authorization', `Bearer ${studentToken}`)
                .expect(200);
            expect(downloadResponse.headers['content-type']).toBe('application/pdf');
            expect(downloadResponse.headers['content-disposition']).toContain('attachment');
        });
        it('should handle certificate revocation', async () => {
            const course = await createTestCourse({
                title: 'Revocable Certificate Course',
                issuesCertificate: true,
            });
            // Complete course and generate certificate
            await request(app.getHttpServer())
                .post('/enrollment/enroll')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                courseId: course.id,
            })
                .expect(201);
            await request(app.getHttpServer())
                .post(`/enrollment/${course.id}/complete`)
                .set('Authorization', `Bearer ${studentToken}`)
                .expect(200);
            const certificateResponse = await request(app.getHttpServer())
                .post('/certificates/generate')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                courseId: course.id,
                studentId: testStudent.id,
            })
                .expect(201);
            const certificateId = certificateResponse.body.id;
            // Revoke certificate (instructor action)
            const revokeResponse = await request(app.getHttpServer())
                .post(`/certificates/${certificateId}/revoke`)
                .set('Authorization', `Bearer ${instructorToken}`)
                .send({
                reason: 'Academic misconduct',
            })
                .expect(200);
            expect(revokeResponse.body).toMatchObject({
                status: 'revoked',
                revokedAt: expect.any(String),
                reason: 'Academic misconduct',
            });
            // Verify certificate is revoked
            const verificationResponse = await request(app.getHttpServer())
                .get(`/certificates/${certificateId}/verify`)
                .expect(200);
            expect(verificationResponse.body.valid).toBe(false);
            expect(verificationResponse.body.reason).toContain('revoked');
        });
    });
});
