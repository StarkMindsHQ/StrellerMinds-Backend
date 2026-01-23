import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';


describe('BalanceController (Integration)', () => {
let app: INestApplication;


beforeAll(async () => {
const moduleRef = await Test.createTestingModule({
imports: [AppModule],
}).compile();


app = moduleRef.createNestApplication();
await app.init();
});


afterAll(async () => app.close());


it('GET /balances → returns user balances', async () => {
await request(app.getHttpServer())
.get('/balances')
.set('Authorization', 'Bearer test-token')
.expect(200);
});
});