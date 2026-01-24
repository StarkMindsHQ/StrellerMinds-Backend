import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { HealthModule } from '../src/health/health.module';
describe('HealthController (e2e)', () => {
    let app;
    beforeEach(async () => {
        const moduleFixture = await Test.createTestingModule({
            imports: [HealthModule],
        }).compile();
        app = moduleFixture.createNestApplication();
        await app.init();
    }, 30000); // Increase timeout to 30 seconds
    afterAll(async () => {
        if (app) {
            await app.close();
        }
    });
    describe('/health (GET)', () => {
        it('should return status ok', () => {
            return request(app.getHttpServer())
                .get('/health')
                .expect(200)
                .expect((res) => {
                expect(res.body.status).toBe('ok');
                expect(res.body.timestamp).toBeDefined();
            });
        });
    });
    describe('/health/db (GET)', () => {
        it('should return database status', () => {
            return request(app.getHttpServer())
                .get('/health/db')
                .expect(200)
                .expect((res) => {
                expect(res.body.database).toBe('connected');
                expect(res.body.timestamp).toBeDefined();
            });
        });
    });
});
