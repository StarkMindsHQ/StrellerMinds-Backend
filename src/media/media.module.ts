import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { BullModule } from '@nestjs/bull';
import { TranscodeProcessor } from './transcode.processor';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomBytes } from 'crypto';
import { extname } from 'path';
import { S3Service } from './s3.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Video } from '../video-streaming/entities/video.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Video]),
    BullModule.registerQueue({
      name: 'transcode',
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    }),
    MulterModule.register({
      storage: diskStorage({
        destination: './temp',
        filename: (req, file, cb) => {
          const randomName = randomBytes(16).toString('hex');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
    }),
  ],
  controllers: [MediaController],
  providers: [MediaService, TranscodeProcessor, S3Service],
})
export class MediaModule {}
