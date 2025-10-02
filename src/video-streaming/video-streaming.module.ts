import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

// Entities
import { Video } from './entities/video.entity';
import { VideoQuality } from './entities/video-quality.entity';
import { VideoAnalytics } from './entities/video-analytics.entity';

// Services
import { VideoStreamingService } from './services/video-streaming.service';
import { AwsCloudFrontService } from './services/aws-cloudfront.service';
import { VideoProcessingService } from './services/video-processing.service';
import { VideoSecurityService } from './services/video-security.service';
import { VideoAnalyticsService } from './services/video-analytics.service';

// Controllers
import { VideoStreamingController } from './controllers/video-streaming.controller';
import { VideoAnalyticsController } from './controllers/video-analytics.controller';

// Processors
import { VideoProcessingProcessor } from './processors/video-processing.processor';

// External modules
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([Video, VideoQuality, VideoAnalytics]),
    BullModule.registerQueue({
      name: 'video-processing',
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
    UsersModule,
  ],
  controllers: [VideoStreamingController, VideoAnalyticsController],
  providers: [
    VideoStreamingService,
    AwsCloudFrontService,
    VideoProcessingService,
    VideoSecurityService,
    VideoAnalyticsService,
    VideoProcessingProcessor,
  ],
  exports: [VideoStreamingService, VideoAnalyticsService, VideoSecurityService],
})
export class VideoStreamingModule {}
