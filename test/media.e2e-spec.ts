import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { MediaModule } from '../src/media/media.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Video } from '../src/video-streaming/entities/video.entity';
import * as path from 'path';
import * as fs from 'fs';

describe('MediaController (e2e)', () => {
  let app: INestApplication;
  let videoId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        AppModule,
        MediaModule,
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [Video],
          synchronize: true,
        }),
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  it('should upload a video and start transcoding', async () => {
    const filePath = path.join(__dirname, 'test.mp4');
    fs.writeFileSync(filePath, 'dummy content');

    const response = await request(app.getHttpServer())
      .post('/media/upload')
      .attach('file', filePath)
      .expect(201);

    expect(response.body).toHaveProperty('videoId');
    videoId = response.body.videoId;

    fs.unlinkSync(filePath);
  });

  it('should get video status', async () => {
    let status = '';
    while (status !== 'READY' && status !== 'FAILED') {
      const response = await request(app.getHttpServer())
        .get(`/media/${videoId}/status`)
        .expect(200);

      status = response.body.status;
      if (status !== 'READY' && status !== 'FAILED') {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    expect(status).toBe('READY');
  }, 60000); // 1 minute timeout for this test
});
