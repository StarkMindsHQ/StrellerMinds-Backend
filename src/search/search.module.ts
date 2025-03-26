/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchService } from '../search/search.service';
import { SearchController } from '../search/search.controller';
import { SearchIndexingService } from './search-indexing.service';
import { SearchAnalyticsService } from './search-analytics.service';
import { Course } from '../courses/entities/course.entity';
import { User } from '../users/entities/user.entity';
import { ForumPost } from '../post/entities/forum-post.entity';
import { ForumTopic } from '../topic/entities/forum-topic.entity';
import { SearchRepository } from './search.repository';
import { SearchAnalytics } from './entities/search-analytics.entity';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Course,
      User,
      ForumPost,
      ForumTopic,
      SearchAnalytics,
    ]),
    EventEmitterModule.forRoot(),
  ],
  controllers: [SearchController],
  providers: [
    SearchService,
    SearchIndexingService,
    SearchRepository,
    SearchAnalyticsService,
  ],
  exports: [SearchService, SearchIndexingService],
})
export class SearchModule {}
