import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';


describe('Auth → Balance Flow (E2E)', () => {
let app: INestApplication;


beforeAll(async () => {
const moduleRef = await Test.createTestingModule({
imports: [AppModule],
}).compile();


app = moduleRef.createNestApplication();
await app.init();
});


afterAll(async () => app.close());


it('User registers, logs in, and fetches balance', async () => {
const email = `user_${Date.now()}@test.com`;
const password = 'Password123!';


await request(app.getHttpServer())
.post('/auth/register')
.send({ email, password })
.expect(201);


const loginRes = await request(app.getHttpServer())
.post('/auth/login')
.send({ email, password })
.expect(200);


const token = loginRes.body.accessToken;


await request(app.getHttpServer())
.get('/balances')
.set('Authorization', `Bearer ${token}`)
.expect(200);
});
});