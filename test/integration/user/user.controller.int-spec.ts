import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';


describe('UserController (Integration)', () => {
let app: INestApplication;


beforeAll(async () => {
const moduleFixture: TestingModule = await Test.createTestingModule({
imports: [AppModule],
}).compile();


app = moduleFixture.createNestApplication();
await app.init();
});


afterAll(async () => {
await app.close();
});


it('GET /users/:id → returns user details', async () => {
await request(app.getHttpServer())
.get('/users/1')
.expect(200);
});
});