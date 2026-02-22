import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VideoController } from './controllers/video.controller';
import { StreamingController } from './controllers/streaming.controller';
import { VideoService } from './services/video.service';
import { TranscodingService } from './services/transcoding.service';
import { StreamingService } from './services/streaming.service';
import { Video } from './entities/video.entity';
import { VideoVariant } from './entities/video-variant.entity';
import { VideoAnalytics } from './entities/video-analytics.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Video, VideoVariant, VideoAnalytics])],
  controllers: [VideoController, StreamingController],
  providers: [VideoService, TranscodingService, StreamingService],
  exports: [VideoService],
})
export class VideoModule {}