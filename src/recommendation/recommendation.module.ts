import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { BullModule } from '@nestjs/bull';

// Entities
import { Recommendation } from './entities/recommendation.entity';
import { LearningPath } from './entities/learning-path.entity';
import { LearningPathStep } from './entities/learning-path-step.entity';
import { UserInteraction } from './entities/user-interaction.entity';
import { RecommendationAnalytics } from './entities/recommendation-analytics.entity';
import { RecommendationMetrics } from './entities/recommendation-metrics.entity';

// Services
import { RecommendationEngineService } from './services/recommendation-engine.service';
import { MLPersonalizationService } from './services/ml-personalization.service';
import { ContentSimilarityService } from './services/content-similarity.service';
import { CollaborativeFilteringService } from './services/collaborative-filtering.service';
import { LearningPathService } from './services/learning-path.service';
import { RecommendationAnalyticsService } from './services/recommendation-analytics.service';
import { RecommendationCacheService } from './services/recommendation-cache.service';
import { PerformanceOptimizationService } from './services/performance-optimization.service';

// Controllers
import { RecommendationController } from './controllers/recommendation.controller';
import { LearningPathController } from './controllers/learning-path.controller';

// Processors
import { RecommendationProcessor } from './processors/recommendation.processor';

// External entities (assuming they exist in other modules)
import { User } from '../user/entities/user.entity';
import { Course } from '../course/entities/course.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      // Recommendation entities
      Recommendation,
      LearningPath,
      LearningPathStep,
      UserInteraction,
      RecommendationAnalytics,
      RecommendationMetrics,
      // External entities
      User,
      Course,
    ]),
    CacheModule.register({
      ttl: 300, // 5 minutes default TTL
      max: 1000, // Maximum number of items in cache
    }),
    BullModule.registerQueue({
      name: 'recommendation-processing',
    }),
  ],
  providers: [
    RecommendationEngineService,
    MLPersonalizationService,
    ContentSimilarityService,
    CollaborativeFilteringService,
    LearningPathService,
    RecommendationAnalyticsService,
    RecommendationCacheService,
    PerformanceOptimizationService,
    RecommendationProcessor,
  ],
  controllers: [RecommendationController, LearningPathController],
  exports: [
    RecommendationEngineService,
    LearningPathService,
    RecommendationAnalyticsService,
    RecommendationCacheService,
    PerformanceOptimizationService,
  ],
})
export class RecommendationModule {}
