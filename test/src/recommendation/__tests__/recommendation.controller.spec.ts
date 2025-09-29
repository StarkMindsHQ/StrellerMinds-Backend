import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { RecommendationController } from '../controllers/recommendation.controller';
import { RecommendationEngineService } from '../services/recommendation-engine.service';
import { RecommendationAnalyticsService } from '../services/recommendation-analytics.service';
import { User } from '../../users/entities/user.entity';
import { Recommendation, RecommendationType, RecommendationReason, RecommendationStatus } from '../entities/recommendation.entity';

describe('RecommendationController', () => {
  let controller: RecommendationController;
  let recommendationService: RecommendationEngineService;
  let analyticsService: RecommendationAnalyticsService;

  const mockUser: User = {
    id: 'user-1',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
  } as User;

  const mockRecommendation: Recommendation = {
    id: 'rec-1',
    userId: 'user-1',
    courseId: 'course-1',
    recommendationType: RecommendationType.CONTENT_BASED,
    reason: RecommendationReason.SKILL_BASED,
    confidenceScore: 0.85,
    relevanceScore: 0.80,
    priority: 4,
    explanation: 'Recommended based on your skills',
    status: RecommendationStatus.ACTIVE,
    metadata: { algorithmUsed: 'content_similarity' },
    course: {
      id: 'course-1',
      title: 'Advanced React',
      description: 'Learn advanced React concepts',
      difficulty: 'intermediate',
      duration: 120,
      rating: 4.5,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Recommendation;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecommendationController],
      providers: [
        {
          provide: RecommendationEngineService,
          useValue: {
            generateRecommendations: jest.fn(),
            getRecommendations: jest.fn(),
            recordInteraction: jest.fn(),
            provideFeedback: jest.fn(),
          },
        },
        {
          provide: RecommendationAnalyticsService,
          useValue: {
            getUserAnalytics: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<RecommendationController>(RecommendationController);
    recommendationService = module.get<RecommendationEngineService>(RecommendationEngineService);
    analyticsService = module.get<RecommendationAnalyticsService>(RecommendationAnalyticsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getRecommendations', () => {
    it('should return recommendations with pagination', async () => {
      // Arrange
      const query = {
        limit: 10,
        offset: 0,
        sortBy: 'createdAt',
        sortOrder: 'DESC' as 'DESC',
      };

      const serviceResult = {
        recommendations: [mockRecommendation],
        total: 1,
      };

      jest.spyOn(recommendationService, 'getRecommendations').mockResolvedValue(serviceResult);

      // Act
      const result = await controller.getRecommendations(mockUser, query);

      // Assert
      expect(result).toBeDefined();
      expect(result.recommendations).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.totalPages).toBe(1);
      expect(recommendationService.getRecommendations).toHaveBeenCalledWith(mockUser.id, query);
    });

    it('should handle service errors gracefully', async () => {
      // Arrange
      const query = {
        limit: 10,
        offset: 0,
        sortBy: 'createdAt',
        sortOrder: 'DESC' as 'DESC',
      };

      jest.spyOn(recommendationService, 'getRecommendations').mockRejectedValue(new Error('Service error'));

      // Act & Assert
      await expect(controller.getRecommendations(mockUser, query)).rejects.toThrow(HttpException);
    });
  });

  describe('generateRecommendations', () => {
    it('should generate new recommendations successfully', async () => {
      // Arrange
      const request = {
        limit: 5,
        minConfidence: 0.1,
        sessionId: 'session-1',
        deviceType: 'desktop',
      };

      jest.spyOn(recommendationService, 'generateRecommendations').mockResolvedValue([mockRecommendation]);

      // Act
      const result = await controller.generateRecommendations(mockUser, request);

      // Assert
      expect(result).toBeDefined();
      expect(result.recommendations).toHaveLength(1);
      expect(result.generationTime).toBeDefined();
      expect(recommendationService.generateRecommendations).toHaveBeenCalledWith({
        userId: mockUser.id,
        type: request.type,
        limit: 5,
        minConfidence: 0.1,
        context: {
          userId: mockUser.id,
          sessionId: 'session-1',
          deviceType: 'desktop',
          context: request.context,
        },
        excludeCourseIds: request.excludeCourseIds,
        includeReasons: request.includeReasons,
      });
    });

    it('should use default values when not provided', async () => {
      // Arrange
      const request = {};

      jest.spyOn(recommendationService, 'generateRecommendations').mockResolvedValue([]);

      // Act
      await controller.generateRecommendations(mockUser, request);

      // Assert
      expect(recommendationService.generateRecommendations).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
          minConfidence: 0.1,
        })
      );
    });
  });

  describe('getRecommendation', () => {
    it('should return specific recommendation and record view', async () => {
      // Arrange
      const recommendationId = 'rec-1';
      const serviceResult = {
        recommendations: [mockRecommendation],
        total: 1,
      };

      jest.spyOn(recommendationService, 'getRecommendations').mockResolvedValue(serviceResult);
      jest.spyOn(recommendationService, 'recordInteraction').mockResolvedValue();

      // Act
      const result = await controller.getRecommendation(mockUser, recommendationId);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(recommendationId);
      expect(recommendationService.recordInteraction).toHaveBeenCalledWith(recommendationId, 'view');
    });

    it('should throw 404 when recommendation not found', async () => {
      // Arrange
      const recommendationId = 'nonexistent-rec';
      const serviceResult = {
        recommendations: [],
        total: 0,
      };

      jest.spyOn(recommendationService, 'getRecommendations').mockResolvedValue(serviceResult);

      // Act & Assert
      await expect(controller.getRecommendation(mockUser, recommendationId)).rejects.toThrow(
        new HttpException('Recommendation not found', HttpStatus.NOT_FOUND)
      );
    });
  });

  describe('recordInteraction', () => {
    it('should record interaction successfully', async () => {
      // Arrange
      const recommendationId = 'rec-1';
      const body = {
        interactionType: 'click' as 'click',
        metadata: { source: 'homepage' },
      };

      jest.spyOn(recommendationService, 'recordInteraction').mockResolvedValue();

      // Act
      const result = await controller.recordInteraction(mockUser, recommendationId, body);

      // Assert
      expect(result).toEqual({
        success: true,
        message: 'Interaction recorded successfully',
      });
      expect(recommendationService.recordInteraction).toHaveBeenCalledWith(
        recommendationId,
        'click',
        body.metadata
      );
    });

    it('should handle service errors', async () => {
      // Arrange
      const recommendationId = 'rec-1';
      const body = { interactionType: 'click' as 'click' };

      jest.spyOn(recommendationService, 'recordInteraction').mockRejectedValue(new Error('Service error'));

      // Act & Assert
      await expect(controller.recordInteraction(mockUser, recommendationId, body)).rejects.toThrow(HttpException);
    });
  });

  describe('provideFeedback', () => {
    it('should record feedback successfully', async () => {
      // Arrange
      const recommendationId = 'rec-1';
      const feedback = {
        score: 4,
        feedbackType: 'explicit' as 'explicit',
        comment: 'Great recommendation!',
      };

      jest.spyOn(recommendationService, 'provideFeedback').mockResolvedValue();

      // Act
      const result = await controller.provideFeedback(mockUser, recommendationId, feedback);

      // Assert
      expect(result).toEqual({
        success: true,
        message: 'Feedback recorded successfully',
      });
      expect(recommendationService.provideFeedback).toHaveBeenCalledWith(
        recommendationId,
        feedback.score,
        feedback.feedbackType,
        feedback.comment
      );
    });
  });

  describe('dismissRecommendation', () => {
    it('should dismiss recommendation successfully', async () => {
      // Arrange
      const recommendationId = 'rec-1';

      jest.spyOn(recommendationService, 'recordInteraction').mockResolvedValue();

      // Act
      const result = await controller.dismissRecommendation(mockUser, recommendationId);

      // Assert
      expect(result).toEqual({
        success: true,
        message: 'Recommendation dismissed successfully',
      });
      expect(recommendationService.recordInteraction).toHaveBeenCalledWith(recommendationId, 'dismiss');
    });
  });

  describe('getAnalyticsSummary', () => {
    it('should return user analytics summary', async () => {
      // Arrange
      const days = 30;
      const analyticsData = {
        totalRecommendationsReceived: 50,
        totalInteractions: 25,
        averageFeedbackScore: 4.2,
        topRecommendationReasons: ['SKILL_BASED', 'SIMILAR_CONTENT'],
        engagementTrend: [
          { date: '2023-01-01', interactions: 5 },
          { date: '2023-01-02', interactions: 3 },
        ],
      };

      jest.spyOn(analyticsService, 'getUserAnalytics').mockResolvedValue(analyticsData);

      // Act
      const result = await controller.getAnalyticsSummary(mockUser, days);

      // Assert
      expect(result).toEqual(analyticsData);
      expect(analyticsService.getUserAnalytics).toHaveBeenCalledWith(mockUser.id, days);
    });

    it('should use default days when not provided', async () => {
      // Arrange
      const analyticsData = {
        totalRecommendationsReceived: 0,
        totalInteractions: 0,
        averageFeedbackScore: 0,
        topRecommendationReasons: [],
        engagementTrend: [],
      };

      jest.spyOn(analyticsService, 'getUserAnalytics').mockResolvedValue(analyticsData);

      // Act
      await controller.getAnalyticsSummary(mockUser);

      // Assert
      expect(analyticsService.getUserAnalytics).toHaveBeenCalledWith(mockUser.id, 30);
    });
  });

  describe('getSimilarCourseRecommendations', () => {
    it('should return similar course recommendations', async () => {
      // Arrange
      const courseId = 'course-1';
      const limit = 5;

      jest.spyOn(recommendationService, 'generateRecommendations').mockResolvedValue([mockRecommendation]);

      // Act
      const result = await controller.getSimilarCourseRecommendations(mockUser, courseId, limit);

      // Assert
      expect(result).toBeDefined();
      expect(result.recommendations).toHaveLength(1);
      expect(result.baseCourse.id).toBe(courseId);
      expect(recommendationService.generateRecommendations).toHaveBeenCalledWith({
        userId: mockUser.id,
        limit,
        minConfidence: 0.3,
        context: {
          userId: mockUser.id,
          currentCourse: courseId,
        },
      });
    });
  });

  describe('provideBulkFeedback', () => {
    it('should process bulk feedback successfully', async () => {
      // Arrange
      const feedbackList = [
        {
          recommendationId: 'rec-1',
          feedback: { score: 4, feedbackType: 'explicit' as 'explicit' },
        },
        {
          recommendationId: 'rec-2',
          feedback: { score: 5, feedbackType: 'explicit' as 'explicit' },
        },
      ];

      jest.spyOn(recommendationService, 'provideFeedback').mockResolvedValue();

      // Act
      const result = await controller.provideBulkFeedback(mockUser, feedbackList);

      // Assert
      expect(result).toEqual({
        success: true,
        processed: 2,
        failed: 0,
      });
      expect(recommendationService.provideFeedback).toHaveBeenCalledTimes(2);
    });

    it('should handle partial failures in bulk feedback', async () => {
      // Arrange
      const feedbackList = [
        {
          recommendationId: 'rec-1',
          feedback: { score: 4, feedbackType: 'explicit' as 'explicit' },
        },
        {
          recommendationId: 'rec-2',
          feedback: { score: 5, feedbackType: 'explicit' as 'explicit' },
        },
      ];

      jest.spyOn(recommendationService, 'provideFeedback')
        .mockResolvedValueOnce()
        .mockRejectedValueOnce(new Error('Service error'));

      // Act
      const result = await controller.provideBulkFeedback(mockUser, feedbackList);

      // Assert
      expect(result).toEqual({
        success: false,
        processed: 1,
        failed: 1,
      });
    });
  });

  describe('getTrendingTopics', () => {
    it('should return trending topics and skills', async () => {
      // Act
      const result = await controller.getTrendingTopics();

      // Assert
      expect(result).toBeDefined();
      expect(result.trendingSkills).toBeDefined();
      expect(result.trendingTopics).toBeDefined();
      expect(Array.isArray(result.trendingSkills)).toBe(true);
      expect(Array.isArray(result.trendingTopics)).toBe(true);
    });
  });

  describe('mapToResponseDto', () => {
    it('should map recommendation entity to response DTO correctly', () => {
      // Act
      const result = (controller as any).mapToResponseDto(mockRecommendation);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(mockRecommendation.id);
      expect(result.courseId).toBe(mockRecommendation.courseId);
      expect(result.recommendationType).toBe(mockRecommendation.recommendationType);
      expect(result.course).toBeDefined();
      expect(result.course.id).toBe(mockRecommendation.course.id);
    });

    it('should handle recommendation without course', () => {
      // Arrange
      const recWithoutCourse = { ...mockRecommendation, course: null };

      // Act
      const result = (controller as any).mapToResponseDto(recWithoutCourse);

      // Assert
      expect(result).toBeDefined();
      expect(result.course).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      // Arrange
      const query = {
        limit: 10,
        offset: 0,
        sortBy: 'createdAt',
        sortOrder: 'DESC' as 'DESC',
      };

      jest.spyOn(recommendationService, 'getRecommendations').mockRejectedValue(new Error('Unexpected error'));

      // Act & Assert
      await expect(controller.getRecommendations(mockUser, query)).rejects.toThrow(
        new HttpException('Failed to get recommendations', HttpStatus.INTERNAL_SERVER_ERROR)
      );
    });

    it('should preserve HttpExceptions from service layer', async () => {
      // Arrange
      const recommendationId = 'rec-1';
      const serviceResult = {
        recommendations: [],
        total: 0,
      };

      jest.spyOn(recommendationService, 'getRecommendations').mockResolvedValue(serviceResult);

      // Act & Assert
      await expect(controller.getRecommendation(mockUser, recommendationId)).rejects.toThrow(HttpException);
    });
  });
});
