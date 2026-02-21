import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiController } from './controllers/ai.controller';
import { ContentRecommendationService } from './services/content-recommendation.service';
import { IntelligentTutoringService } from './services/intelligent-tutoring.service';
import { LearningPatternAnalysisService } from './services/learning-pattern-analysis.service';
import { NodeProgress } from '../learning-path/entities/node-progress.entity';
import { LearningPathEnrollment } from '../learning-path/entities/learning-path-enrollment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([NodeProgress, LearningPathEnrollment]),
  ],
  controllers: [AiController],
  providers: [
    ContentRecommendationService,
    IntelligentTutoringService,
    LearningPatternAnalysisService,
  ],
  exports: [ContentRecommendationService, LearningPatternAnalysisService],
})
export class AiModule {}