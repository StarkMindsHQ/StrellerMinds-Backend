import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ContentRecommendationService } from '../services/content-recommendation.service';
import { IntelligentTutoringService } from '../services/intelligent-tutoring.service';
import { LearningPatternAnalysisService } from '../services/learning-pattern-analysis.service';
import { GetRecommendationsDto, TutoringQueryDto } from '../dto/ai-interaction.dto';

@ApiTags('AI & Recommendations')
@Controller('ai')
export class AiController {
  constructor(
    private readonly recommendationService: ContentRecommendationService,
    private readonly tutoringService: IntelligentTutoringService,
    private readonly patternService: LearningPatternAnalysisService,
  ) {}

  @Get('recommendations/:userId')
  @ApiOperation({ summary: 'Get personalized content recommendations' })
  async getRecommendations(
    @Param('userId') userId: string,
    @Query('limit') limit?: number,
  ) {
    return this.recommendationService.getPersonalizedRecommendations(userId, limit);
  }

  @Get('patterns/:userId')
  @ApiOperation({ summary: 'Analyze user learning patterns' })
  async getLearningPatterns(@Param('userId') userId: string) {
    return this.patternService.analyzeUserPattern(userId);
  }

  @Post('tutor/query')
  @ApiOperation({ summary: 'Ask the intelligent tutor a question' })
  async askTutor(@Body() queryDto: TutoringQueryDto) {
    return this.tutoringService.processQuery(queryDto);
  }

  @Post('recommendations/track')
  @ApiOperation({ summary: 'Track interaction with recommendations for RLHF' })
  async trackInteraction(@Body() body: { userId: string, recId: string, action: 'click' | 'view' | 'dismiss' }) {
    return this.recommendationService.trackEngagement(body.userId, body.recId, body.action);
  }
}