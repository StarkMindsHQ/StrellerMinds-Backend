import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios'; // For SearchMLService
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { Course } from '../courses/entities/course.entity';
import { SearchAnalytics } from './entities/search-analytics.entity';
import { SearchCache } from './entities/search-cache.entity';
import { SearchFilter } from './entities/search-filter.entity';
import { PopularSearch } from './entities/popular-search.entity';
import { SearchAnalyticsInterceptor } from './interceptors/search-analytics.interceptor';
import { SearchRecommendationService } from './services/search-recommendation.service';
import { SearchMLService } from './services/search-ml.service';
import { SearchExportService } from './services/search-export.service';
import { SearchIndexingService } from './services/search-indexing.service';
import { UserCourseInteraction } from '../users/entities/user-course-interaction.entity'; // For SearchRecommendationService
import { User } from '../users/entities/user.entity'; // For SearchRecommendationService
import { CachingModule } from '../caching/caching.module'; // Import the new CachingModule

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Course,
      SearchAnalytics,
      SearchCache,
      SearchFilter,
      PopularSearch,
      UserCourseInteraction,
      User,
    ]),
    ElasticsearchModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        node: configService.get('ELASTICSEARCH_NODE', 'http://localhost:9200'),
        auth: {
          username: configService.get('ELASTICSEARCH_USERNAME'),
          password: configService.get('ELASTICSEARCH_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),
    ConfigModule,
    ScheduleModule.forRoot(), // Required for @Cron decorators
    HttpModule, // Required for SearchMLService
    CachingModule, // Import the CachingModule
  ],
  providers: [
    SearchService,
    SearchAnalyticsInterceptor,
    SearchRecommendationService,
    SearchMLService,
    SearchExportService,
    SearchIndexingService,
  ],
  controllers: [SearchController],
  exports: [SearchService], // Export SearchService if other modules need it
})
export class SearchModule {}
