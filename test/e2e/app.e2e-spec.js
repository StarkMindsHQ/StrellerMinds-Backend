import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
describe('AppController (e2e)', () => {
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
    it('/ (GET)', () => {
        return request(app.getHttpServer())
            .get('/')
            .expect(200)
            .expect('Hello World!');
    });
    it('/test-error/not-found (GET)', () => {
        return request(app.getHttpServer())
            .get('/test-error/not-found')
            .expect(404, {
            statusCode: 404,
            message: 'Resource not found',
            error: 'Not Found',
        });
    });
});
