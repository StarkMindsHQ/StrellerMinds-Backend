import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { getDataSourceToken } from '@nestjs/typeorm';
import { config } from 'dotenv';
// Load test env
config({ path: '.env.test' });
process.env.NODE_ENV = 'test';
export default async function globalSetup() {
    const app = await NestFactory.create(AppModule);
    const ds = app.get(getDataSourceToken());
    await ds.dropDatabase();
    await ds.synchronize();
    await app.close();
}
