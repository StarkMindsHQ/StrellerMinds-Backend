import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VideoController } from './video.controller';
import { VideoService } from './video.service';
import { TranscodingService } from './transcoding.service';
import { Video } from './entities/video.entity';
import { Chapter } from './entities/chapter.entity';
import { Quiz } from './entities/quiz.entity';
import { VideoAnalytics } from './entities/video-analytics.entity';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [TypeOrmModule.forFeature([Video, Chapter, Quiz, VideoAnalytics]), FilesModule],
  controllers: [VideoController],
  providers: [VideoService, TranscodingService],
  exports: [VideoService],
})
export class VideoModule {}
