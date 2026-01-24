import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { EmailModule } from '../../src/email/email.module';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailLog } from '../../src/email/entities/email-log.entity';
import { EmailTrackingUtil } from '../../src/email/utils/tracking.util';
describe('Email Tracking (Integration)', () => {
    let app;
    let trackingUtil;
    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({ isGlobal: true }),
                TypeOrmModule.forRoot({
                    type: 'sqlite',
                    database: ':memory:',
                    dropSchema: true,
                    entities: [EmailLog],
                    synchronize: true,
                }),
                EmailModule,
            ],
        }).compile();
        app = moduleRef.createNestApplication();
        await app.init();
        trackingUtil = app.get(EmailTrackingUtil);
    });
    afterAll(async () => {
        await app.close();
    });
    it('GET /email/track/open/:token.png returns pixel', async () => {
        const res = await request(app.getHttpServer()).get('/email/track/open/testtoken.png').expect(200);
        expect(res.headers['content-type']).toContain('image/png');
    });
    it('GET /email/track/click/:token redirects with valid signature', async () => {
        const token = 'tok123';
        const url = 'https://example.com';
        const sig = trackingUtil.signUrl(token, url);
        const res = await request(app.getHttpServer())
            .get(`/email/track/click/${token}?url=${encodeURIComponent(url)}&sig=${sig}`)
            .expect(302);
        expect(res.headers.location).toBe(url);
    });
});
