import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LearningPathService, LearningGoal } from '../services/learning-path.service';
import { RecommendationAnalyticsService } from '../services/recommendation-analytics.service';
import { ContentSimilarityService } from '../services/content-similarity.service';
import { LearningPath, LearningPathStep, LearningPathStatus, StepType } from '../entities/learning-path.entity';
import { UserInteraction, InteractionType } from '../entities/user-interaction.entity';
import { User } from '../../users/entities/user.entity';
import { Course } from '../../courses/entities/course.entity';

describe('LearningPathService', () => {
  let service: LearningPathService;
  let learningPathRepository: Repository<LearningPath>;
  let stepRepository: Repository<LearningPathStep>;
  let userRepository: Repository<User>;
  let courseRepository: Repository<Course>;
  let interactionRepository: Repository<UserInteraction>;
  let analyticsService: RecommendationAnalyticsService;
  let similarityService: ContentSimilarityService;

  const mockUser: User = {
    id: 'user-1',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    skills: ['JavaScript', 'HTML', 'CSS'],
    desiredSkills: ['React', 'Node.js', 'Python'],
  } as User;

  const mockCourse: Course = {
    id: 'course-1',
    title: 'React Fundamentals',
    description: 'Learn React basics',
    difficulty: 'beginner',
    duration: 120,
    rating: 4.5,
    tags: ['React', 'JavaScript', 'Frontend'],
    skills: ['React', 'JavaScript'],
    instructor: 'Jane Doe',
    isActive: true,
  } as Course;

  const mockLearningGoal: LearningGoal = {
    targetSkills: ['React', 'Redux'],
    currentLevel: 'beginner',
    targetLevel: 'intermediate',
    timeframe: 8,
    preferences: {
      maxCoursesPerWeek: 2,
      preferredDuration: 90,
      includeTopics: ['Frontend'],
    },
  };

  const mockLearningPath: LearningPath = {
    id: 'path-1',
    userId: 'user-1',
    title: 'React & Redux Learning Path',
    description: 'Master React and Redux',
    targetSkills: ['React', 'Redux'],
    currentLevel: 'beginner',
    targetLevel: 'intermediate',
    status: LearningPathStatus.NOT_STARTED,
    totalSteps: 5,
    completedSteps: 0,
    progressPercentage: 0,
    estimatedDuration: 600,
    steps: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as LearningPath;

  const mockStep: LearningPathStep = {
    id: 'step-1',
    learningPathId: 'path-1',
    courseId: 'course-1',
    stepType: StepType.COURSE,
    title: 'React Fundamentals',
    description: 'Learn React basics',
    stepOrder: 1,
    estimatedDuration: 120,
    completed: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as LearningPathStep;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LearningPathService,
        {
          provide: getRepositoryToken(LearningPath),
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
          provide: getRepositoryToken(LearningPathStep),
          useValue: {
            save: jest.fn(),
            find: jest.fn(),
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
          provide: getRepositoryToken(UserInteraction),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: RecommendationAnalyticsService,
          useValue: {
            trackRecommendationGeneration: jest.fn(),
          },
        },
        {
          provide: ContentSimilarityService,
          useValue: {
            findSimilarCourses: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<LearningPathService>(LearningPathService);
    learningPathRepository = module.get<Repository<LearningPath>>(getRepositoryToken(LearningPath));
    stepRepository = module.get<Repository<LearningPathStep>>(getRepositoryToken(LearningPathStep));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    courseRepository = module.get<Repository<Course>>(getRepositoryToken(Course));
    interactionRepository = module.get<Repository<UserInteraction>>(getRepositoryToken(UserInteraction));
    analyticsService = module.get<RecommendationAnalyticsService>(RecommendationAnalyticsService);
    similarityService = module.get<ContentSimilarityService>(ContentSimilarityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateLearningPath', () => {
    it('should generate a learning path successfully', async () => {
      // Arrange
      const userId = 'user-1';
      const options = {
        maxCourses: 5,
        includeAssessments: true,
        includeProjects: true,
        adaptToProgress: true,
        considerPrerequisites: true,
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(interactionRepository, 'find').mockResolvedValue([]);
      jest.spyOn(courseRepository, 'createQueryBuilder').mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockCourse]),
      } as any);
      jest.spyOn(learningPathRepository, 'save').mockResolvedValue({ ...mockLearningPath, id: 'generated-path-id' });
      jest.spyOn(stepRepository, 'save').mockResolvedValue([mockStep]);
      jest.spyOn(analyticsService, 'trackRecommendationGeneration').mockResolvedValue();

      // Act
      const result = await service.generateLearningPath(userId, mockLearningGoal, options);

      // Assert
      expect(result).toBeDefined();
      expect(result.userId).toBe(userId);
      expect(result.targetSkills).toEqual(mockLearningGoal.targetSkills);
      expect(learningPathRepository.save).toHaveBeenCalled();
      expect(stepRepository.save).toHaveBeenCalled();
      expect(analyticsService.trackRecommendationGeneration).toHaveBeenCalled();
    });

    it('should handle user with no existing skills', async () => {
      // Arrange
      const userWithoutSkills = { ...mockUser, skills: [] };
      const userId = 'user-1';

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(userWithoutSkills);
      jest.spyOn(interactionRepository, 'find').mockResolvedValue([]);
      jest.spyOn(courseRepository, 'createQueryBuilder').mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockCourse]),
      } as any);
      jest.spyOn(learningPathRepository, 'save').mockResolvedValue(mockLearningPath);
      jest.spyOn(stepRepository, 'save').mockResolvedValue([mockStep]);

      // Act
      const result = await service.generateLearningPath(userId, mockLearningGoal);

      // Assert
      expect(result).toBeDefined();
      expect(result.currentLevel).toBe('beginner');
    });

    it('should include assessments when option is enabled', async () => {
      // Arrange
      const userId = 'user-1';
      const options = {
        maxCourses: 2,
        includeAssessments: true,
        includeProjects: false,
        adaptToProgress: true,
        considerPrerequisites: true,
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(interactionRepository, 'find').mockResolvedValue([]);
      jest.spyOn(courseRepository, 'createQueryBuilder').mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockCourse]),
      } as any);
      jest.spyOn(learningPathRepository, 'save').mockResolvedValue(mockLearningPath);
      jest.spyOn(stepRepository, 'save').mockImplementation((steps: any) => {
        const hasAssessment = steps.some((step: any) => step.stepType === StepType.ASSESSMENT);
        expect(hasAssessment).toBe(true);
        return Promise.resolve(steps);
      });

      // Act
      await service.generateLearningPath(userId, mockLearningGoal, options);

      // Assert
      expect(stepRepository.save).toHaveBeenCalled();
    });
  });

  describe('getUserLearningPaths', () => {
    it('should retrieve user learning paths with filters', async () => {
      // Arrange
      const userId = 'user-1';
      const query = {
        status: LearningPathStatus.IN_PROGRESS,
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
        getMany: jest.fn().mockResolvedValue([mockLearningPath]),
      };

      jest.spyOn(learningPathRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      // Act
      const result = await service.getUserLearningPaths(userId, query);

      // Assert
      expect(result).toBeDefined();
      expect(result.paths).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('path.userId = :userId', { userId });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('path.status = :status', { status: query.status });
    });

    it('should filter by skill area when provided', async () => {
      // Arrange
      const userId = 'user-1';
      const query = {
        skillArea: 'React',
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
        getMany: jest.fn().mockResolvedValue([mockLearningPath]),
      };

      jest.spyOn(learningPathRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      // Act
      const result = await service.getUserLearningPaths(userId, query);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('path.targetSkills @> :skillArea', { skillArea: ['React'] });
    });
  });

  describe('updateProgress', () => {
    it('should mark step as completed and update path progress', async () => {
      // Arrange
      const pathId = 'path-1';
      const stepId = 'step-1';
      const pathWithSteps = {
        ...mockLearningPath,
        steps: [mockStep, { ...mockStep, id: 'step-2', completed: false }],
        totalSteps: 2,
      };

      jest.spyOn(learningPathRepository, 'findOne').mockResolvedValue(pathWithSteps);
      jest.spyOn(stepRepository, 'save').mockResolvedValue({ ...mockStep, completed: true });
      jest.spyOn(learningPathRepository, 'save').mockImplementation((path: any) => {
        expect(path.completedSteps).toBe(1);
        expect(path.progressPercentage).toBe(50);
        expect(path.status).toBe(LearningPathStatus.IN_PROGRESS);
        return Promise.resolve(path);
      });

      // Act
      const result = await service.updateProgress(pathId, stepId, true);

      // Assert
      expect(result).toBeDefined();
      expect(stepRepository.save).toHaveBeenCalled();
      expect(learningPathRepository.save).toHaveBeenCalled();
    });

    it('should complete path when all steps are completed', async () => {
      // Arrange
      const pathId = 'path-1';
      const stepId = 'step-2';
      const pathWithSteps = {
        ...mockLearningPath,
        steps: [
          { ...mockStep, completed: true },
          { ...mockStep, id: 'step-2', completed: false }
        ],
        totalSteps: 2,
      };

      jest.spyOn(learningPathRepository, 'findOne').mockResolvedValue(pathWithSteps);
      jest.spyOn(stepRepository, 'save').mockResolvedValue({ ...mockStep, id: 'step-2', completed: true });
      jest.spyOn(learningPathRepository, 'save').mockImplementation((path: any) => {
        expect(path.progressPercentage).toBe(100);
        expect(path.status).toBe(LearningPathStatus.COMPLETED);
        expect(path.completedAt).toBeDefined();
        return Promise.resolve(path);
      });

      // Act
      await service.updateProgress(pathId, stepId, true);

      // Assert
      expect(learningPathRepository.save).toHaveBeenCalled();
    });

    it('should throw error when path not found', async () => {
      // Arrange
      const pathId = 'nonexistent-path';
      const stepId = 'step-1';

      jest.spyOn(learningPathRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(service.updateProgress(pathId, stepId, true)).rejects.toThrow(
        `Learning path ${pathId} not found`
      );
    });

    it('should throw error when step not found', async () => {
      // Arrange
      const pathId = 'path-1';
      const stepId = 'nonexistent-step';
      const pathWithSteps = {
        ...mockLearningPath,
        steps: [mockStep],
      };

      jest.spyOn(learningPathRepository, 'findOne').mockResolvedValue(pathWithSteps);

      // Act & Assert
      await expect(service.updateProgress(pathId, stepId, true)).rejects.toThrow(
        `Step ${stepId} not found in learning path`
      );
    });
  });

  describe('adaptLearningPath', () => {
    it('should adapt learning path based on user performance', async () => {
      // Arrange
      const pathId = 'path-1';
      const pathWithSteps = {
        ...mockLearningPath,
        steps: [mockStep],
        user: mockUser,
      };

      jest.spyOn(learningPathRepository, 'findOne').mockResolvedValue(pathWithSteps);
      jest.spyOn(learningPathRepository, 'save').mockImplementation((path: any) => {
        expect(path.metadata.lastAdaptedAt).toBeDefined();
        return Promise.resolve(path);
      });

      // Act
      const result = await service.adaptLearningPath(pathId);

      // Assert
      expect(result).toBeDefined();
      expect(learningPathRepository.save).toHaveBeenCalled();
    });

    it('should throw error when path not found for adaptation', async () => {
      // Arrange
      const pathId = 'nonexistent-path';

      jest.spyOn(learningPathRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(service.adaptLearningPath(pathId)).rejects.toThrow(
        `Learning path ${pathId} not found`
      );
    });
  });

  describe('getPathRecommendations', () => {
    it('should generate path recommendations for user', async () => {
      // Arrange
      const userId = 'user-1';
      const limit = 3;

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(interactionRepository, 'find').mockResolvedValue([]);

      // Act
      const result = await service.getPathRecommendations(userId, limit);

      // Assert
      expect(result).toBeDefined();
      expect(result.skillBasedPaths).toBeDefined();
      expect(result.trendingPaths).toBeDefined();
      expect(result.continuationPaths).toBeDefined();
    });

    it('should throw error when user not found for recommendations', async () => {
      // Arrange
      const userId = 'nonexistent-user';

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(service.getPathRecommendations(userId)).rejects.toThrow(
        `User ${userId} not found`
      );
    });
  });

  describe('analyzeUserProfile', () => {
    it('should analyze user profile correctly', async () => {
      // Arrange
      const userId = 'user-1';
      const interactions = [
        {
          interactionType: InteractionType.COMPLETE,
          course: { skills: ['React', 'JavaScript'] },
        },
        {
          interactionType: InteractionType.ENROLL,
          course: { skills: ['Vue', 'JavaScript'] },
        },
      ] as UserInteraction[];

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(interactionRepository, 'find').mockResolvedValue(interactions);

      // Act
      const profile = await (service as any).analyzeUserProfile(userId);

      // Assert
      expect(profile).toBeDefined();
      expect(profile.currentSkills).toContain('React');
      expect(profile.currentSkills).toContain('JavaScript');
      expect(profile.completionRate).toBe(0.5); // 1 completion out of 2 enrollments
      expect(profile.learningStyle).toBeDefined();
      expect(profile.preferredDifficulty).toBeDefined();
    });
  });

  describe('calculateCourseRelevanceScore', () => {
    it('should calculate relevance score correctly', () => {
      // Arrange
      const course = {
        skills: ['React', 'JavaScript'],
        rating: 4.5,
        duration: 90,
        prerequisites: ['HTML', 'CSS'],
      } as Course;

      const userProfile = {
        currentSkills: ['HTML', 'CSS', 'JavaScript'],
      };

      const goal = {
        targetSkills: ['React', 'Redux'],
        preferences: { preferredDuration: 90 },
      } as LearningGoal;

      // Act
      const score = (service as any).calculateCourseRelevanceScore(course, userProfile, goal);

      // Assert
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe('sequenceCourses', () => {
    it('should sequence courses by difficulty progression', async () => {
      // Arrange
      const courses = [
        { ...mockCourse, difficulty: 'advanced', id: 'course-advanced' },
        { ...mockCourse, difficulty: 'beginner', id: 'course-beginner' },
        { ...mockCourse, difficulty: 'intermediate', id: 'course-intermediate' },
      ] as Course[];

      const userProfile = { currentSkills: ['HTML', 'CSS'] };
      const goal = { currentLevel: 'beginner', targetLevel: 'advanced' } as LearningGoal;
      const options = { maxCourses: 3, considerPrerequisites: true } as any;

      // Act
      const result = await (service as any).sequenceCourses(courses, userProfile, goal, options);

      // Assert
      expect(result).toBeDefined();
      expect(result.length).toBeLessThanOrEqual(options.maxCourses);
      // Should start with beginner courses
      expect(result[0].difficulty).toBe('beginner');
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      // Arrange
      const userId = 'user-1';

      jest.spyOn(userRepository, 'findOne').mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(service.generateLearningPath(userId, mockLearningGoal)).rejects.toThrow();
    });

    it('should handle empty course results', async () => {
      // Arrange
      const userId = 'user-1';

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(interactionRepository, 'find').mockResolvedValue([]);
      jest.spyOn(courseRepository, 'createQueryBuilder').mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]), // No courses found
      } as any);
      jest.spyOn(learningPathRepository, 'save').mockResolvedValue(mockLearningPath);
      jest.spyOn(stepRepository, 'save').mockResolvedValue([]);

      // Act
      const result = await service.generateLearningPath(userId, mockLearningGoal);

      // Assert
      expect(result).toBeDefined();
      expect(result.totalSteps).toBe(0);
    });
  });

  describe('performance tests', () => {
    it('should handle complex learning goals efficiently', async () => {
      // Arrange
      const complexGoal: LearningGoal = {
        targetSkills: ['React', 'Redux', 'Node.js', 'MongoDB', 'GraphQL'],
        currentLevel: 'beginner',
        targetLevel: 'advanced',
        timeframe: 16,
        preferences: {
          maxCoursesPerWeek: 3,
          preferredDuration: 120,
          includeTopics: ['Frontend', 'Backend', 'Database'],
          excludeTopics: ['Mobile'],
        },
      };

      const manyCourses = Array.from({ length: 50 }, (_, i) => ({
        ...mockCourse,
        id: `course-${i}`,
        title: `Course ${i}`,
        skills: ['React', 'JavaScript'],
      })) as Course[];

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(interactionRepository, 'find').mockResolvedValue([]);
      jest.spyOn(courseRepository, 'createQueryBuilder').mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(manyCourses),
      } as any);
      jest.spyOn(learningPathRepository, 'save').mockResolvedValue(mockLearningPath);
      jest.spyOn(stepRepository, 'save').mockResolvedValue([]);

      const startTime = Date.now();

      // Act
      const result = await service.generateLearningPath('user-1', complexGoal);

      // Assert
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      expect(result).toBeDefined();
      expect(executionTime).toBeLessThan(3000); // Should complete within 3 seconds
    });
  });
});
