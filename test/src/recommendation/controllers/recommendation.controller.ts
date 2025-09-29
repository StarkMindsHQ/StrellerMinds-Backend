import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { User } from '../../users/entities/user.entity';
import { RecommendationEngineService } from '../services/recommendation-engine.service';
import { RecommendationAnalyticsService } from '../services/recommendation-analytics.service';
import {
  CreateRecommendationDto,
  UpdateRecommendationDto,
  GetRecommendationsQueryDto,
  RecommendationResponseDto,
  RecommendationFeedbackDto,
  BulkRecommendationRequestDto,
} from '../dto/recommendation.dto';
import { Recommendation } from '../entities/recommendation.entity';

@ApiTags('Recommendations')
@Controller('recommendations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RecommendationController {
  private readonly logger = new Logger(RecommendationController.name);

  constructor(
    private readonly recommendationService: RecommendationEngineService,
    private readonly analyticsService: RecommendationAnalyticsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get personalized recommendations for the current user' })
  @ApiResponse({
    status: 200,
    description: 'Returns personalized recommendations',
    type: [RecommendationResponseDto],
  })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by recommendation type' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of recommendations to return' })
  @ApiQuery({ name: 'minConfidence', required: false, description: 'Minimum confidence score' })
  async getRecommendations(
    @GetUser() user: User,
    @Query() query: GetRecommendationsQueryDto,
  ): Promise<{
    recommendations: RecommendationResponseDto[];
    total: number;
    pagination: {
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    try {
      this.logger.log(`Getting recommendations for user ${user.id}`);

      const result = await this.recommendationService.getRecommendations(user.id, query);

      const totalPages = Math.ceil(result.total / query.limit);

      return {
        recommendations: result.recommendations.map(rec => this.mapToResponseDto(rec)),
        total: result.total,
        pagination: {
          page: Math.floor(query.offset / query.limit) + 1,
          limit: query.limit,
          totalPages,
        },
      };
    } catch (error) {
      this.logger.error(`Error getting recommendations for user ${user.id}:`, error);
      throw new HttpException(
        'Failed to get recommendations',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('generate')
  @ApiOperation({ summary: 'Generate new personalized recommendations' })
  @ApiResponse({
    status: 201,
    description: 'New recommendations generated successfully',
    type: [RecommendationResponseDto],
  })
  async generateRecommendations(
    @GetUser() user: User,
    @Body() request: BulkRecommendationRequestDto,
  ): Promise<{
    recommendations: RecommendationResponseDto[];
    generationTime: number;
  }> {
    try {
      this.logger.log(`Generating recommendations for user ${user.id}`);
      const startTime = Date.now();

      const recommendations = await this.recommendationService.generateRecommendations({
        userId: user.id,
        type: request.type,
        limit: request.limit || 10,
        minConfidence: request.minConfidence || 0.1,
        context: {
          userId: user.id,
          sessionId: request.sessionId,
          deviceType: request.deviceType,
          context: request.context,
        },
        excludeCourseIds: request.excludeCourseIds,
        includeReasons: request.includeReasons,
      });

      const generationTime = Date.now() - startTime;

      return {
        recommendations: recommendations.map(rec => this.mapToResponseDto(rec)),
        generationTime,
      };
    } catch (error) {
      this.logger.error(`Error generating recommendations for user ${user.id}:`, error);
      throw new HttpException(
        'Failed to generate recommendations',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific recommendation by ID' })
  @ApiParam({ name: 'id', description: 'Recommendation ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the recommendation details',
    type: RecommendationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Recommendation not found' })
  async getRecommendation(
    @GetUser() user: User,
    @Param('id') id: string,
  ): Promise<RecommendationResponseDto> {
    try {
      const recommendations = await this.recommendationService.getRecommendations(user.id, {
        limit: 1,
        offset: 0,
        sortBy: 'createdAt',
        sortOrder: 'DESC',
      });

      const recommendation = recommendations.recommendations.find(r => r.id === id);
      
      if (!recommendation) {
        throw new HttpException('Recommendation not found', HttpStatus.NOT_FOUND);
      }

      // Track view interaction
      await this.recommendationService.recordInteraction(id, 'view');

      return this.mapToResponseDto(recommendation);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error getting recommendation ${id}:`, error);
      throw new HttpException(
        'Failed to get recommendation',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/interact')
  @ApiOperation({ summary: 'Record user interaction with a recommendation' })
  @ApiParam({ name: 'id', description: 'Recommendation ID' })
  @ApiResponse({ status: 200, description: 'Interaction recorded successfully' })
  @ApiResponse({ status: 404, description: 'Recommendation not found' })
  async recordInteraction(
    @GetUser() user: User,
    @Param('id') id: string,
    @Body() body: { interactionType: 'view' | 'click' | 'dismiss'; metadata?: any },
  ): Promise<{ success: boolean; message: string }> {
    try {
      await this.recommendationService.recordInteraction(
        id,
        body.interactionType,
        body.metadata,
      );

      return {
        success: true,
        message: 'Interaction recorded successfully',
      };
    } catch (error) {
      this.logger.error(`Error recording interaction for recommendation ${id}:`, error);
      throw new HttpException(
        'Failed to record interaction',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/feedback')
  @ApiOperation({ summary: 'Provide feedback on a recommendation' })
  @ApiParam({ name: 'id', description: 'Recommendation ID' })
  @ApiResponse({ status: 200, description: 'Feedback recorded successfully' })
  @ApiResponse({ status: 404, description: 'Recommendation not found' })
  async provideFeedback(
    @GetUser() user: User,
    @Param('id') id: string,
    @Body() feedback: RecommendationFeedbackDto,
  ): Promise<{ success: boolean; message: string }> {
    try {
      await this.recommendationService.provideFeedback(
        id,
        feedback.score,
        feedback.feedbackType,
        feedback.comment,
      );

      return {
        success: true,
        message: 'Feedback recorded successfully',
      };
    } catch (error) {
      this.logger.error(`Error recording feedback for recommendation ${id}:`, error);
      throw new HttpException(
        'Failed to record feedback',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Dismiss a recommendation' })
  @ApiParam({ name: 'id', description: 'Recommendation ID' })
  @ApiResponse({ status: 200, description: 'Recommendation dismissed successfully' })
  @ApiResponse({ status: 404, description: 'Recommendation not found' })
  async dismissRecommendation(
    @GetUser() user: User,
    @Param('id') id: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      await this.recommendationService.recordInteraction(id, 'dismiss');

      return {
        success: true,
        message: 'Recommendation dismissed successfully',
      };
    } catch (error) {
      this.logger.error(`Error dismissing recommendation ${id}:`, error);
      throw new HttpException(
        'Failed to dismiss recommendation',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('analytics/summary')
  @ApiOperation({ summary: 'Get recommendation analytics summary for the current user' })
  @ApiResponse({
    status: 200,
    description: 'Returns user recommendation analytics',
  })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days to analyze (default: 30)' })
  async getAnalyticsSummary(
    @GetUser() user: User,
    @Query('days') days: number = 30,
  ): Promise<{
    totalRecommendationsReceived: number;
    totalInteractions: number;
    averageFeedbackScore: number;
    topRecommendationReasons: string[];
    engagementTrend: Array<{ date: string; interactions: number }>;
  }> {
    try {
      const analytics = await this.analyticsService.getUserAnalytics(user.id, days);
      return analytics;
    } catch (error) {
      this.logger.error(`Error getting analytics for user ${user.id}:`, error);
      throw new HttpException(
        'Failed to get analytics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('similar/:courseId')
  @ApiOperation({ summary: 'Get recommendations similar to a specific course' })
  @ApiParam({ name: 'courseId', description: 'Course ID to find similar recommendations for' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of similar courses to return' })
  @ApiResponse({
    status: 200,
    description: 'Returns similar course recommendations',
  })
  async getSimilarCourseRecommendations(
    @GetUser() user: User,
    @Param('courseId') courseId: string,
    @Query('limit') limit: number = 5,
  ): Promise<{
    recommendations: RecommendationResponseDto[];
    baseCourse: { id: string; title: string };
  }> {
    try {
      // Generate recommendations based on the specific course
      const recommendations = await this.recommendationService.generateRecommendations({
        userId: user.id,
        limit,
        minConfidence: 0.3,
        context: {
          userId: user.id,
          currentCourse: courseId,
        },
      });

      return {
        recommendations: recommendations.map(rec => this.mapToResponseDto(rec)),
        baseCourse: {
          id: courseId,
          title: 'Course Title', // Would be fetched from course service
        },
      };
    } catch (error) {
      this.logger.error(`Error getting similar recommendations for course ${courseId}:`, error);
      throw new HttpException(
        'Failed to get similar recommendations',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('bulk-feedback')
  @ApiOperation({ summary: 'Provide feedback on multiple recommendations' })
  @ApiResponse({ status: 200, description: 'Bulk feedback recorded successfully' })
  async provideBulkFeedback(
    @GetUser() user: User,
    @Body() feedbackList: Array<{ recommendationId: string; feedback: RecommendationFeedbackDto }>,
  ): Promise<{ success: boolean; processed: number; failed: number }> {
    let processed = 0;
    let failed = 0;

    for (const item of feedbackList) {
      try {
        await this.recommendationService.provideFeedback(
          item.recommendationId,
          item.feedback.score,
          item.feedback.feedbackType,
          item.feedback.comment,
        );
        processed++;
      } catch (error) {
        this.logger.error(`Error processing feedback for recommendation ${item.recommendationId}:`, error);
        failed++;
      }
    }

    return {
      success: failed === 0,
      processed,
      failed,
    };
  }

  @Get('trending/topics')
  @ApiOperation({ summary: 'Get trending topics and skills for recommendations' })
  @ApiResponse({
    status: 200,
    description: 'Returns trending topics and skills',
  })
  async getTrendingTopics(): Promise<{
    trendingSkills: Array<{ skill: string; growth: number; popularity: number }>;
    trendingTopics: Array<{ topic: string; courseCount: number; enrollments: number }>;
  }> {
    try {
      // This would typically fetch from analytics or a trending service
      // For now, return mock data
      return {
        trendingSkills: [
          { skill: 'React', growth: 25.5, popularity: 8.9 },
          { skill: 'Python', growth: 22.1, popularity: 9.2 },
          { skill: 'Machine Learning', growth: 35.7, popularity: 7.8 },
          { skill: 'DevOps', growth: 18.3, popularity: 7.5 },
          { skill: 'Cloud Computing', growth: 28.9, popularity: 8.1 },
        ],
        trendingTopics: [
          { topic: 'Web Development', courseCount: 156, enrollments: 12450 },
          { topic: 'Data Science', courseCount: 89, enrollments: 8920 },
          { topic: 'Mobile Development', courseCount: 67, enrollments: 6780 },
          { topic: 'Cybersecurity', courseCount: 45, enrollments: 5640 },
          { topic: 'AI/ML', courseCount: 78, enrollments: 7890 },
        ],
      };
    } catch (error) {
      this.logger.error('Error getting trending topics:', error);
      throw new HttpException(
        'Failed to get trending topics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Map Recommendation entity to RecommendationResponseDto
   */
  private mapToResponseDto(recommendation: Recommendation): RecommendationResponseDto {
    return {
      id: recommendation.id,
      courseId: recommendation.courseId,
      course: recommendation.course ? {
        id: recommendation.course.id,
        title: recommendation.course.title,
        description: recommendation.course.description,
        difficulty: recommendation.course.difficulty,
        duration: recommendation.course.duration,
        rating: recommendation.course.rating,
        tags: recommendation.course.tags,
        skills: recommendation.course.skills,
        instructor: recommendation.course.instructor,
        thumbnailUrl: recommendation.course.thumbnailUrl,
      } : undefined,
      recommendationType: recommendation.recommendationType,
      reason: recommendation.reason,
      confidenceScore: recommendation.confidenceScore,
      relevanceScore: recommendation.relevanceScore,
      priority: recommendation.priority,
      explanation: recommendation.explanation,
      status: recommendation.status,
      metadata: recommendation.metadata,
      mlFeatures: recommendation.mlFeatures,
      viewedAt: recommendation.viewedAt,
      clickedAt: recommendation.clickedAt,
      dismissedAt: recommendation.dismissedAt,
      expiresAt: recommendation.expiresAt,
      createdAt: recommendation.createdAt,
      updatedAt: recommendation.updatedAt,
    };
  }
}
