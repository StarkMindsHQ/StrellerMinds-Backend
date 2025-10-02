import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecommendationEngineService } from '../services/recommendation-engine.service';
import { RecommendationAnalyticsService } from '../services/recommendation-analytics.service';
import { MLPersonalizationService } from '../services/ml-personalization.service';
import { ContentSimilarityService } from '../services/content-similarity.service';
import { CollaborativeFilteringService } from '../services/collaborative-filtering.service';
import {
  Recommendation,
  RecommendationType,
  RecommendationReason,
  RecommendationStatus,
} from '../entities/recommendation.entity';
import { UserInteraction, InteractionType } from '../entities/user-interaction.entity';
import { User } from '../../users/entities/user.entity';
import { Course } from '../../courses/entities/course.entity';

describe('RecommendationEngineService', () => {
  let service: RecommendationEngineService;
  let recommendationRepository: Repository<Recommendation>;
  let interactionRepository: Repository<UserInteraction>;
  let userRepository: Repository<User>;
  let courseRepository: Repository<Course>;
  let analyticsService: RecommendationAnalyticsService;
  let mlService: MLPersonalizationService;
  let similarityService: ContentSimilarityService;
  let collaborativeService: CollaborativeFilteringService;

  const mockUser: User = {
    id: 'user-1',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    skills: ['JavaScript', 'React'],
    desiredSkills: ['Python', 'Machine Learning'],
    preferences: { favoriteTopics: ['Web Development', 'AI'] },
  } as User;

  const mockCourse: Course = {
    id: 'course-1',
    title: 'Advanced React Development',
    description: 'Learn advanced React concepts',
    difficulty: 'intermediate',
    duration: 120,
    rating: 4.5,
    tags: ['React', 'JavaScript', 'Frontend'],
    skills: ['React', 'JavaScript', 'Redux'],
    instructor: 'John Doe',
    isActive: true,
  } as Course;

  const mockRecommendation: Recommendation = {
    id: 'rec-1',
    userId: 'user-1',
    courseId: 'course-1',
    recommendationType: RecommendationType.CONTENT_BASED,
    reason: RecommendationReason.SKILL_BASED,
    confidenceScore: 0.85,
    relevanceScore: 0.8,
    priority: 4,
    explanation: 'Recommended based on your React skills',
    status: RecommendationStatus.ACTIVE,
    metadata: { algorithmUsed: 'content_similarity' },
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Recommendation;

  const mockInteraction: UserInteraction = {
    id: 'int-1',
    userId: 'user-1',
    courseId: 'course-1',
    interactionType: InteractionType.ENROLL,
    context: 'recommendation' as any,
    weightedValue: 0.8,
    createdAt: new Date(),
  } as UserInteraction;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationEngineService,
        {
          provide: getRepositoryToken(Recommendation),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              skip: jest.fn().mockReturnThis(),
              take: jest.fn().mockReturnThis(),
              getCount: jest.fn(),
              getMany: jest.fn(),
            })),
          },
        },
        {
          provide: getRepositoryToken(UserInteraction),
          useValue: {
            find: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Course),
          useValue: {
            find: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              take: jest.fn().mockReturnThis(),
              getMany: jest.fn(),
            })),
          },
        },
        {
          provide: RecommendationAnalyticsService,
          useValue: {
            trackRecommendationGeneration: jest.fn(),
            trackRecommendationInteraction: jest.fn(),
            trackRecommendationFeedback: jest.fn(),
          },
        },
        {
          provide: MLPersonalizationService,
          useValue: {
            generatePersonalizedRecommendations: jest.fn(),
            updateModelWithFeedback: jest.fn(),
          },
        },
        {
          provide: ContentSimilarityService,
          useValue: {
            generateContentBasedRecommendations: jest.fn(),
          },
        },
        {
          provide: CollaborativeFilteringService,
          useValue: {
            generateRecommendations: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RecommendationEngineService>(RecommendationEngineService);
    recommendationRepository = module.get<Repository<Recommendation>>(
      getRepositoryToken(Recommendation),
    );
    interactionRepository = module.get<Repository<UserInteraction>>(
      getRepositoryToken(UserInteraction),
    );
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    courseRepository = module.get<Repository<Course>>(getRepositoryToken(Course));
    analyticsService = module.get<RecommendationAnalyticsService>(RecommendationAnalyticsService);
    mlService = module.get<MLPersonalizationService>(MLPersonalizationService);
    similarityService = module.get<ContentSimilarityService>(ContentSimilarityService);
    collaborativeService = module.get<CollaborativeFilteringService>(CollaborativeFilteringService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateRecommendations', () => {
    it('should generate recommendations successfully', async () => {
      // Arrange
      const request = {
        userId: 'user-1',
        limit: 5,
        minConfidence: 0.1,
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(interactionRepository, 'find').mockResolvedValue([mockInteraction]);
      jest.spyOn(collaborativeService, 'generateRecommendations').mockResolvedValue([
        {
          userId: 'user-1',
          courseId: 'course-1',
          recommendationType: RecommendationType.COLLABORATIVE,
          reason: RecommendationReason.SIMILAR_USERS,
          confidenceScore: 0.7,
          relevanceScore: 0.65,
          priority: 3,
          explanation: 'Users like you also liked this course',
          metadata: { algorithmUsed: 'collaborative_filtering' },
        },
      ]);
      jest.spyOn(similarityService, 'generateContentBasedRecommendations').mockResolvedValue([
        {
          userId: 'user-1',
          courseId: 'course-2',
          recommendationType: RecommendationType.CONTENT_BASED,
          reason: RecommendationReason.SIMILAR_CONTENT,
          confidenceScore: 0.8,
          relevanceScore: 0.75,
          priority: 4,
          explanation: 'Similar to courses you have taken',
          metadata: { algorithmUsed: 'content_similarity' },
        },
      ]);
      jest.spyOn(mlService, 'generatePersonalizedRecommendations').mockResolvedValue([
        {
          userId: 'user-1',
          courseId: 'course-3',
          recommendationType: RecommendationType.CONTENT_BASED,
          reason: RecommendationReason.INTEREST_BASED,
          confidenceScore: 0.9,
          relevanceScore: 0.85,
          priority: 5,
          explanation: 'Highly personalized for your interests',
          metadata: { algorithmUsed: 'ml_personalization' },
        },
      ]);
      jest.spyOn(recommendationRepository, 'save').mockResolvedValue([mockRecommendation] as any);
      jest.spyOn(analyticsService, 'trackRecommendationGeneration').mockResolvedValue();

      // Act
      const result = await service.generateRecommendations(request);

      // Assert
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: 'user-1' } });
      expect(collaborativeService.generateRecommendations).toHaveBeenCalled();
      expect(similarityService.generateContentBasedRecommendations).toHaveBeenCalled();
      expect(mlService.generatePersonalizedRecommendations).toHaveBeenCalled();
      expect(recommendationRepository.save).toHaveBeenCalled();
      expect(analyticsService.trackRecommendationGeneration).toHaveBeenCalled();
    });

    it('should throw error when user not found', async () => {
      // Arrange
      const request = {
        userId: 'nonexistent-user',
        limit: 5,
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(service.generateRecommendations(request)).rejects.toThrow(
        'User nonexistent-user not found',
      );
    });

    it('should handle empty recommendations gracefully', async () => {
      // Arrange
      const request = {
        userId: 'user-1',
        limit: 5,
        minConfidence: 0.9, // High threshold
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(interactionRepository, 'find').mockResolvedValue([]);
      jest.spyOn(collaborativeService, 'generateRecommendations').mockResolvedValue([]);
      jest.spyOn(similarityService, 'generateContentBasedRecommendations').mockResolvedValue([]);
      jest.spyOn(mlService, 'generatePersonalizedRecommendations').mockResolvedValue([]);
      jest.spyOn(recommendationRepository, 'save').mockResolvedValue([]);

      // Act
      const result = await service.generateRecommendations(request);

      // Assert
      expect(result).toBeDefined();
      expect(result.length).toBe(0);
    });
  });

  describe('getRecommendations', () => {
    it('should retrieve user recommendations with filters', async () => {
      // Arrange
      const userId = 'user-1';
      const query = {
        type: RecommendationType.CONTENT_BASED,
        limit: 10,
        offset: 0,
        sortBy: 'createdAt',
        sortOrder: 'DESC' as 'DESC',
      };

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
        getMany: jest.fn().mockResolvedValue([mockRecommendation]),
      };

      jest
        .spyOn(recommendationRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      // Act
      const result = await service.getRecommendations(userId, query);

      // Assert
      expect(result).toBeDefined();
      expect(result.recommendations).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('recommendation.userId = :userId', {
        userId,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'recommendation.recommendationType = :type',
        { type: query.type },
      );
    });

    it('should apply default filters when none specified', async () => {
      // Arrange
      const userId = 'user-1';
      const query = {
        limit: 10,
        offset: 0,
        sortBy: 'createdAt',
        sortOrder: 'DESC' as 'DESC',
      };

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
        getMany: jest.fn().mockResolvedValue([]),
      };

      jest
        .spyOn(recommendationRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      // Act
      const result = await service.getRecommendations(userId, query);

      // Assert
      expect(result).toBeDefined();
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('recommendation.status = :status', {
        status: RecommendationStatus.ACTIVE,
      });
    });
  });

  describe('recordInteraction', () => {
    it('should record view interaction successfully', async () => {
      // Arrange
      const recommendationId = 'rec-1';
      const interactionType = 'view';
      const metadata = { source: 'homepage' };

      jest.spyOn(recommendationRepository, 'findOne').mockResolvedValue(mockRecommendation);
      jest.spyOn(recommendationRepository, 'save').mockResolvedValue(mockRecommendation);
      jest.spyOn(analyticsService, 'trackRecommendationInteraction').mockResolvedValue();
      jest.spyOn(interactionRepository, 'save').mockResolvedValue(mockInteraction);

      // Act
      await service.recordInteraction(recommendationId, interactionType, metadata);

      // Assert
      expect(recommendationRepository.findOne).toHaveBeenCalledWith({
        where: { id: recommendationId },
      });
      expect(recommendationRepository.save).toHaveBeenCalled();
      expect(analyticsService.trackRecommendationInteraction).toHaveBeenCalledWith({
        recommendationId,
        userId: mockRecommendation.userId,
        interactionType,
        metadata,
      });
    });

    it('should record click interaction and update clickedAt', async () => {
      // Arrange
      const recommendationId = 'rec-1';
      const interactionType = 'click';

      jest.spyOn(recommendationRepository, 'findOne').mockResolvedValue(mockRecommendation);
      jest.spyOn(recommendationRepository, 'save').mockImplementation((rec: any) => {
        expect(rec.clickedAt).toBeDefined();
        return Promise.resolve(rec);
      });
      jest.spyOn(analyticsService, 'trackRecommendationInteraction').mockResolvedValue();
      jest.spyOn(interactionRepository, 'save').mockResolvedValue(mockInteraction);

      // Act
      await service.recordInteraction(recommendationId, interactionType);

      // Assert
      expect(recommendationRepository.save).toHaveBeenCalled();
    });

    it('should record dismiss interaction and update status', async () => {
      // Arrange
      const recommendationId = 'rec-1';
      const interactionType = 'dismiss';

      jest.spyOn(recommendationRepository, 'findOne').mockResolvedValue(mockRecommendation);
      jest.spyOn(recommendationRepository, 'save').mockImplementation((rec: any) => {
        expect(rec.status).toBe(RecommendationStatus.DISMISSED);
        expect(rec.dismissedAt).toBeDefined();
        return Promise.resolve(rec);
      });
      jest.spyOn(analyticsService, 'trackRecommendationInteraction').mockResolvedValue();
      jest.spyOn(interactionRepository, 'save').mockResolvedValue(mockInteraction);

      // Act
      await service.recordInteraction(recommendationId, interactionType);

      // Assert
      expect(recommendationRepository.save).toHaveBeenCalled();
    });

    it('should throw error when recommendation not found', async () => {
      // Arrange
      const recommendationId = 'nonexistent-rec';
      const interactionType = 'view';

      jest.spyOn(recommendationRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(service.recordInteraction(recommendationId, interactionType)).rejects.toThrow(
        `Recommendation ${recommendationId} not found`,
      );
    });
  });

  describe('provideFeedback', () => {
    it('should record feedback successfully', async () => {
      // Arrange
      const recommendationId = 'rec-1';
      const score = 4;
      const feedbackType = 'explicit';
      const comment = 'Great recommendation!';

      jest.spyOn(recommendationRepository, 'findOne').mockResolvedValue(mockRecommendation);
      jest.spyOn(recommendationRepository, 'save').mockImplementation((rec: any) => {
        expect(rec.metadata.feedback).toBeDefined();
        expect(rec.metadata.feedback.score).toBe(score);
        expect(rec.metadata.feedback.comment).toBe(comment);
        return Promise.resolve(rec);
      });
      jest.spyOn(analyticsService, 'trackRecommendationFeedback').mockResolvedValue();
      jest.spyOn(mlService, 'updateModelWithFeedback').mockResolvedValue();

      // Act
      await service.provideFeedback(recommendationId, score, feedbackType, comment);

      // Assert
      expect(recommendationRepository.save).toHaveBeenCalled();
      expect(analyticsService.trackRecommendationFeedback).toHaveBeenCalledWith({
        recommendationId,
        userId: mockRecommendation.userId,
        score,
        feedbackType,
        comment,
      });
      expect(mlService.updateModelWithFeedback).toHaveBeenCalledWith(
        mockRecommendation.userId,
        recommendationId,
        score,
      );
    });

    it('should throw error when recommendation not found for feedback', async () => {
      // Arrange
      const recommendationId = 'nonexistent-rec';
      const score = 4;

      jest.spyOn(recommendationRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(service.provideFeedback(recommendationId, score)).rejects.toThrow(
        `Recommendation ${recommendationId} not found`,
      );
    });
  });

  describe('buildRecommendationContext', () => {
    it('should build context with user interactions and profile', async () => {
      // Arrange
      const request = {
        userId: 'user-1',
        context: {
          sessionId: 'session-1',
          deviceType: 'mobile',
        },
      };

      jest.spyOn(interactionRepository, 'find').mockResolvedValue([mockInteraction]);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);

      // Act
      const context = await (service as any).buildRecommendationContext(request);

      // Assert
      expect(context).toBeDefined();
      expect(context.userId).toBe('user-1');
      expect(context.recentInteractions).toHaveLength(1);
      expect(context.userProfile).toBe(mockUser);
      expect(context.sessionId).toBe('session-1');
      expect(context.deviceType).toBe('mobile');
    });
  });

  describe('removeDuplicateRecommendations', () => {
    it('should remove duplicate recommendations based on course and type', () => {
      // Arrange
      const recommendations = [
        {
          courseId: 'course-1',
          recommendationType: RecommendationType.CONTENT_BASED,
          confidenceScore: 0.8,
        },
        {
          courseId: 'course-1',
          recommendationType: RecommendationType.CONTENT_BASED,
          confidenceScore: 0.7,
        },
        {
          courseId: 'course-2',
          recommendationType: RecommendationType.COLLABORATIVE,
          confidenceScore: 0.6,
        },
      ];

      // Act
      const result = (service as any).removeDuplicateRecommendations(recommendations);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].courseId).toBe('course-1');
      expect(result[0].confidenceScore).toBe(0.8); // Should keep the first one
      expect(result[1].courseId).toBe('course-2');
    });
  });

  describe('ensureRecommendationDiversity', () => {
    it('should limit recommendations per type and topic', () => {
      // Arrange
      const recommendations = [
        {
          recommendationType: RecommendationType.CONTENT_BASED,
          metadata: { tags: ['React'] },
        },
        {
          recommendationType: RecommendationType.CONTENT_BASED,
          metadata: { tags: ['React'] },
        },
        {
          recommendationType: RecommendationType.CONTENT_BASED,
          metadata: { tags: ['Vue'] },
        },
        {
          recommendationType: RecommendationType.COLLABORATIVE,
          metadata: { tags: ['Angular'] },
        },
      ];

      // Act
      const result = (service as any).ensureRecommendationDiversity(recommendations);

      // Assert
      expect(result.length).toBeLessThanOrEqual(recommendations.length);
      // Should not have more than 3 of the same type
      const contentBasedCount = result.filter(
        (r) => r.recommendationType === RecommendationType.CONTENT_BASED,
      ).length;
      expect(contentBasedCount).toBeLessThanOrEqual(3);
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      // Arrange
      const request = {
        userId: 'user-1',
        limit: 5,
      };

      jest
        .spyOn(userRepository, 'findOne')
        .mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(service.generateRecommendations(request)).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should handle service errors in recommendation generation', async () => {
      // Arrange
      const request = {
        userId: 'user-1',
        limit: 5,
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(interactionRepository, 'find').mockResolvedValue([]);
      jest
        .spyOn(collaborativeService, 'generateRecommendations')
        .mockRejectedValue(new Error('ML service unavailable'));
      jest.spyOn(similarityService, 'generateContentBasedRecommendations').mockResolvedValue([]);
      jest.spyOn(mlService, 'generatePersonalizedRecommendations').mockResolvedValue([]);

      // Act & Assert
      await expect(service.generateRecommendations(request)).rejects.toThrow();
    });
  });

  describe('performance tests', () => {
    it('should handle large number of recommendations efficiently', async () => {
      // Arrange
      const request = {
        userId: 'user-1',
        limit: 100,
      };

      const largeMockRecommendations = Array.from({ length: 100 }, (_, i) => ({
        userId: 'user-1',
        courseId: `course-${i}`,
        recommendationType: RecommendationType.CONTENT_BASED,
        reason: RecommendationReason.SKILL_BASED,
        confidenceScore: Math.random(),
        relevanceScore: Math.random(),
        priority: Math.floor(Math.random() * 5) + 1,
        explanation: `Recommendation ${i}`,
        metadata: { algorithmUsed: 'test' },
      }));

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(interactionRepository, 'find').mockResolvedValue([]);
      jest
        .spyOn(collaborativeService, 'generateRecommendations')
        .mockResolvedValue(largeMockRecommendations.slice(0, 40));
      jest
        .spyOn(similarityService, 'generateContentBasedRecommendations')
        .mockResolvedValue(largeMockRecommendations.slice(40, 70));
      jest
        .spyOn(mlService, 'generatePersonalizedRecommendations')
        .mockResolvedValue(largeMockRecommendations.slice(70, 100));
      jest
        .spyOn(recommendationRepository, 'save')
        .mockResolvedValue(largeMockRecommendations as any);

      const startTime = Date.now();

      // Act
      const result = await service.generateRecommendations(request);

      // Assert
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      expect(result).toBeDefined();
      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.length).toBeLessThanOrEqual(100);
    });
  });
});
