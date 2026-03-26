import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  CourseAnalytics,
  UserAnalytics,
  LearningPathAnalytics,
  EngagementMetrics,
} from '../entities/analytics.entity';
import { User } from '../../user/entities/user.entity';
import { Course } from '../../course/entities/course.entity';
import {
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let courseAnalyticsRepository: jest.Mocked<Repository<CourseAnalytics>>;
  let userAnalyticsRepository: jest.Mocked<Repository<UserAnalytics>>;
  let learningPathAnalyticsRepository: jest.Mocked<Repository<LearningPathAnalytics>>;
  let engagementMetricsRepository: jest.Mocked<Repository<EngagementMetrics>>;

  const mockCourseAnalytics: Partial<CourseAnalytics> = {
    id: 'course-analytics-1',
    courseId: 'course-1',
    totalEnrollments: 100,
    activeEnrollments: 85,
    completionRate: 0.75,
    averageCompletionTime: 7200, // 2 hours in seconds
    averageScore: 85.5,
    dropoutRate: 0.15,
    revenue: 10000,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUserAnalytics: Partial<UserAnalytics> = {
    id: 'user-analytics-1',
    userId: 'user-1',
    totalCoursesEnrolled: 5,
    totalCoursesCompleted: 3,
    totalTimeSpent: 36000, // 10 hours in seconds
    averageScore: 88.2,
    streakDays: 7,
    lastActiveDate: new Date(),
    achievementsUnlocked: 10,
    skillProgress: { javascript: 0.8, python: 0.6 },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockLearningPathAnalytics: Partial<LearningPathAnalytics> = {
    id: 'path-analytics-1',
    learningPathId: 'path-1',
    totalEnrollments: 50,
    activeEnrollments: 40,
    completionRate: 0.8,
    averageCompletionTime: 14400, // 4 hours in seconds
    dropoutPoints: ['module-2', 'module-5'],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockEngagementMetrics: Partial<EngagementMetrics> = {
    id: 'engagement-1',
    userId: 'user-1',
    date: new Date(),
    logins: 2,
    timeSpent: 3600, // 1 hour
    videosWatched: 3,
    quizzesTaken: 2,
    forumPosts: 1,
    achievementsEarned: 1,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: getRepositoryToken(CourseAnalytics),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserAnalytics),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(LearningPathAnalytics),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(EngagementMetrics),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    courseAnalyticsRepository = module.get(getRepositoryToken(CourseAnalytics));
    userAnalyticsRepository = module.get(getRepositoryToken(UserAnalytics));
    learningPathAnalyticsRepository = module.get(getRepositoryToken(LearningPathAnalytics));
    engagementMetricsRepository = module.get(getRepositoryToken(EngagementMetrics));
  });

  describe('getCourseAnalytics', () => {
    it('should return course analytics for a valid course ID', async () => {
      courseAnalyticsRepository.findOne.mockResolvedValue(mockCourseAnalytics as CourseAnalytics);

      const result = await service.getCourseAnalytics('course-1');

      expect(result).toBeDefined();
      expect(result.courseId).toBe('course-1');
      expect(result.totalEnrollments).toBe(100);
      expect(courseAnalyticsRepository.findOne).toHaveBeenCalledWith({
        where: { courseId: 'course-1' },
      });
    });

    it('should throw NotFoundException for non-existent course', async () => {
      courseAnalyticsRepository.findOne.mockResolvedValue(null);

      await expect(service.getCourseAnalytics('nonexistent-course')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateCourseAnalytics', () => {
    it('should update course analytics successfully', async () => {
      const updateData = {
        totalEnrollments: 105,
        activeEnrollments: 88,
        completionRate: 0.78,
      };

      courseAnalyticsRepository.findOne.mockResolvedValue(mockCourseAnalytics as CourseAnalytics);
      courseAnalyticsRepository.update.mockResolvedValue(undefined);
      courseAnalyticsRepository.findOne.mockResolvedValue({
        ...mockCourseAnalytics,
        ...updateData,
      } as CourseAnalytics);

      const result = await service.updateCourseAnalytics('course-1', updateData);

      expect(result.totalEnrollments).toBe(105);
      expect(result.activeEnrollments).toBe(88);
      expect(result.completionRate).toBe(0.78);
      expect(courseAnalyticsRepository.update).toHaveBeenCalledWith(
        { courseId: 'course-1' },
        updateData,
      );
    });

    it('should create new analytics if none exist', async () => {
      const updateData = {
        totalEnrollments: 10,
        activeEnrollments: 8,
        completionRate: 0.5,
      };

      courseAnalyticsRepository.findOne.mockResolvedValue(null);
      courseAnalyticsRepository.create.mockReturnValue({
        courseId: 'course-1',
        ...updateData,
      } as CourseAnalytics);
      courseAnalyticsRepository.save.mockResolvedValue({
        id: 'new-analytics',
        courseId: 'course-1',
        ...updateData,
      } as CourseAnalytics);

      const result = await service.updateCourseAnalytics('course-1', updateData);

      expect(result.courseId).toBe('course-1');
      expect(result.totalEnrollments).toBe(10);
      expect(courseAnalyticsRepository.create).toHaveBeenCalled();
      expect(courseAnalyticsRepository.save).toHaveBeenCalled();
    });
  });

  describe('getUserAnalytics', () => {
    it('should return user analytics for a valid user ID', async () => {
      userAnalyticsRepository.findOne.mockResolvedValue(mockUserAnalytics as UserAnalytics);

      const result = await service.getUserAnalytics('user-1');

      expect(result).toBeDefined();
      expect(result.userId).toBe('user-1');
      expect(result.totalCoursesEnrolled).toBe(5);
      expect(result.totalCoursesCompleted).toBe(3);
      expect(userAnalyticsRepository.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });

    it('should throw NotFoundException for non-existent user', async () => {
      userAnalyticsRepository.findOne.mockResolvedValue(null);

      await expect(service.getUserAnalytics('nonexistent-user')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('trackUserEngagement', () => {
    it('should track user engagement metrics successfully', async () => {
      const engagementData = {
        userId: 'user-1',
        logins: 2,
        timeSpent: 3600,
        videosWatched: 3,
        quizzesTaken: 2,
        forumPosts: 1,
        achievementsEarned: 1,
      };

      engagementMetricsRepository.create.mockReturnValue({
        ...engagementData,
        date: new Date(),
      } as EngagementMetrics);
      engagementMetricsRepository.save.mockResolvedValue({
        id: 'engagement-1',
        ...engagementData,
        date: new Date(),
      } as EngagementMetrics);

      const result = await service.trackUserEngagement(engagementData);

      expect(result.userId).toBe('user-1');
      expect(result.logins).toBe(2);
      expect(engagementMetricsRepository.create).toHaveBeenCalled();
      expect(engagementMetricsRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid engagement data', async () => {
      const invalidData = {
        userId: '',
        logins: -1,
        timeSpent: -100,
      };

      await expect(service.trackUserEngagement(invalidData)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getLearningPathAnalytics', () => {
    it('should return learning path analytics', async () => {
      learningPathAnalyticsRepository.findOne.mockResolvedValue(
        mockLearningPathAnalytics as LearningPathAnalytics,
      );

      const result = await service.getLearningPathAnalytics('path-1');

      expect(result).toBeDefined();
      expect(result.learningPathId).toBe('path-1');
      expect(result.totalEnrollments).toBe(50);
      expect(result.completionRate).toBe(0.8);
    });
  });

  describe('getEngagementMetrics', () => {
    it('should return engagement metrics for a date range', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockEngagementMetrics as EngagementMetrics]),
      };

      engagementMetricsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');

      const result = await service.getEngagementMetrics('user-1', startDate, endDate);

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe('user-1');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('userId = :userId', {
        userId: 'user-1',
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'date >= :startDate AND date <= :endDate',
        { startDate, endDate },
      );
    });

    it('should return empty array for no metrics in date range', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      engagementMetricsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getEngagementMetrics('user-1', new Date(), new Date());

      expect(result).toHaveLength(0);
    });
  });

  describe('getDashboardAnalytics', () => {
    it('should return comprehensive dashboard analytics', async () => {
      const mockCourseQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalCourses: 10,
          totalEnrollments: 500,
          averageCompletionRate: 0.75,
        }),
      };

      const mockUserQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalUsers: 100,
          activeUsers: 85,
          averageTimeSpent: 7200,
        }),
      };

      courseAnalyticsRepository.createQueryBuilder.mockReturnValue(mockCourseQueryBuilder as any);
      userAnalyticsRepository.createQueryBuilder.mockReturnValue(mockUserQueryBuilder as any);

      const result = await service.getDashboardAnalytics();

      expect(result).toHaveProperty('courses');
      expect(result).toHaveProperty('users');
      expect(result.courses.totalCourses).toBe(10);
      expect(result.courses.totalEnrollments).toBe(500);
      expect(result.users.totalUsers).toBe(100);
      expect(result.users.activeUsers).toBe(85);
    });

    it('should handle database errors gracefully', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockRejectedValue(new Error('Database error')),
      };

      courseAnalyticsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      userAnalyticsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await expect(service.getDashboardAnalytics()).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('calculateCompletionRate', () => {
    it('should calculate completion rate correctly', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          completed: 75,
          total: 100,
        }),
      };

      courseAnalyticsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.calculateCompletionRate('course-1');

      expect(result).toBe(0.75);
    });

    it('should return 0 for no enrollments', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          completed: 0,
          total: 0,
        }),
      };

      courseAnalyticsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.calculateCompletionRate('course-1');

      expect(result).toBe(0);
    });
  });

  describe('getTopPerformingCourses', () => {
    it('should return top performing courses by completion rate', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { courseId: 'course-1', completionRate: 0.95, enrollments: 100 },
          { courseId: 'course-2', completionRate: 0.90, enrollments: 85 },
        ]),
      };

      courseAnalyticsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getTopPerformingCourses(5);

      expect(result).toHaveLength(2);
      expect(result[0].courseId).toBe('course-1');
      expect(result[0].completionRate).toBe(0.95);
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(5);
    });
  });

  describe('getUserProgressOverTime', () => {
    it('should return user progress over time', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { date: '2023-01-01', coursesCompleted: 1, timeSpent: 3600 },
          { date: '2023-01-02', coursesCompleted: 2, timeSpent: 7200 },
        ]),
      };

      userAnalyticsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');

      const result = await service.getUserProgressOverTime('user-1', startDate, endDate);

      expect(result).toHaveLength(2);
      expect(result[0].coursesCompleted).toBe(1);
      expect(result[1].coursesCompleted).toBe(2);
    });
  });
});
