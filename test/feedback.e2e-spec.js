import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
describe('FeedbackController (e2e)', () => {
    let app;
    let authToken;
    let adminToken;
    let createdFeedbackId;
    beforeAll(async () => {
        const moduleFixture = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();
        app = moduleFixture.createNestApplication();
        await app.init();
        // Login as regular user
        const userLoginResponse = await request(app.getHttpServer())
            .post('/auth/login')
            .send({
            email: 'test@example.com',
            password: 'password123',
        });
        authToken = userLoginResponse.body.access_token;
        // Login as admin
        const adminLoginResponse = await request(app.getHttpServer())
            .post('/auth/login')
            .send({
            email: 'admin@example.com',
            password: 'admin123',
        });
        adminToken = adminLoginResponse.body.access_token;
    });
    afterAll(async () => {
        await app.close();
    });
    describe('POST /feedback', () => {
        it('should create new feedback', () => {
            const createFeedbackDto = {
                recipientId: 'recipient-uuid',
                content: 'Great work on the project!',
                isAnonymous: false,
                category: 'project',
                rating: 5,
                template: {
                    name: 'project_feedback',
                    fields: {
                        strengths: 'Good documentation',
                        improvements: 'Could add more tests',
                    },
                },
                visibility: 'course',
            };
            return request(app.getHttpServer())
                .post('/feedback')
                .set('Authorization', `Bearer ${authToken}`)
                .send(createFeedbackDto)
                .expect(201)
                .expect((res) => {
                expect(res.body).toHaveProperty('id');
                expect(res.body.content).toBe(createFeedbackDto.content);
                createdFeedbackId = res.body.id;
            });
        });
        it('should not create feedback with invalid data', () => {
            const invalidFeedbackDto = {
                recipientId: 'invalid-uuid',
                content: 'Too short',
                isAnonymous: 'not-a-boolean',
            };
            return request(app.getHttpServer())
                .post('/feedback')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invalidFeedbackDto)
                .expect(400);
        });
    });
    describe('GET /feedback/received', () => {
        it('should get received feedback', () => {
            return request(app.getHttpServer())
                .get('/feedback/received')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200)
                .expect((res) => {
                expect(Array.isArray(res.body)).toBe(true);
            });
        });
    });
    describe('GET /feedback/sent', () => {
        it('should get sent feedback', () => {
            return request(app.getHttpServer())
                .get('/feedback/sent')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200)
                .expect((res) => {
                expect(Array.isArray(res.body)).toBe(true);
            });
        });
    });
    describe('GET /feedback/stats', () => {
        it('should get feedback statistics', () => {
            return request(app.getHttpServer())
                .get('/feedback/stats')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200)
                .expect((res) => {
                expect(res.body).toHaveProperty('received');
                expect(res.body).toHaveProperty('sent');
                expect(res.body.received).toHaveProperty('total');
                expect(res.body.received).toHaveProperty('byCategory');
                expect(res.body.received).toHaveProperty('averageRating');
            });
        });
    });
    describe('PATCH /feedback/:id/respond', () => {
        it('should respond to feedback', () => {
            const respondDto = {
                response: 'Thank you for the feedback! I will work on improving the tests.',
            };
            return request(app.getHttpServer())
                .patch(`/feedback/${createdFeedbackId}/respond`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(respondDto)
                .expect(200)
                .expect((res) => {
                expect(res.body.response).toBe(respondDto.response);
                expect(res.body.respondedAt).toBeDefined();
            });
        });
        it('should not respond to non-existent feedback', () => {
            const respondDto = {
                response: 'This should fail',
            };
            return request(app.getHttpServer())
                .patch('/feedback/non-existent-id/respond')
                .set('Authorization', `Bearer ${authToken}`)
                .send(respondDto)
                .expect(404);
        });
    });
    describe('PATCH /feedback/flag/:id', () => {
        it('should flag feedback as admin', () => {
            return request(app.getHttpServer())
                .patch(`/feedback/flag/${createdFeedbackId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200)
                .expect((res) => {
                expect(res.body.isFlagged).toBe(true);
            });
        });
        it('should not flag feedback as regular user', () => {
            return request(app.getHttpServer())
                .patch(`/feedback/flag/${createdFeedbackId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(403);
        });
    });
    describe('DELETE /feedback/flagged/:id', () => {
        it('should remove flagged feedback as admin', () => {
            return request(app.getHttpServer())
                .delete(`/feedback/flagged/${createdFeedbackId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);
        });
        it('should not remove flagged feedback as regular user', () => {
            return request(app.getHttpServer())
                .delete(`/feedback/flagged/${createdFeedbackId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(403);
        });
    });
});
