import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProgressService } from './progress.service';
import { UserProgress } from '../entities/user-progress.entity';
import { Course } from '../../courses/entities/course.entity';
import { Lesson } from '../../lesson/entity/lesson.entity';
import { CourseModule } from '../../courses/entities/course-module.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('ProgressService', () => {
  let service: ProgressService;
  let progressRepository: Repository<UserProgress>;
  let courseRepository: Repository<Course>;
  let lessonRepository: Repository<Lesson>;
  let moduleRepository: Repository<CourseModule>;

  const mockUserProgress = {
    id: '1',
    progressPercentage: 0,
    isCompleted: false,
    user: { id: 'user1' },
    course: { id: 'course1' },
    lesson: { id: 'lesson1' },
    module: { id: 'module1' },
  };

  const mockCourse = {
    id: 'course1',
    title: 'Test Course',
    modules: [
      {
        id: 'module1',
        title: 'Module 1',
        lessons: [
          { id: 'lesson1', title: 'Lesson 1' },
          { id: 'lesson2', title: 'Lesson 2' },
        ],
      },
    ],
  };

  const mockLesson = {
    id: 'lesson1',
    title: 'Lesson 1',
    module: { id: 'module1', courseId: 'course1' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProgressService,
        {
          provide: getRepositoryToken(UserProgress),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Course),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Lesson),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(CourseModule),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProgressService>(ProgressService);
    progressRepository = module.get<Repository<UserProgress>>(
      getRepositoryToken(UserProgress),
    );
    courseRepository = module.get<Repository<Course>>(
      getRepositoryToken(Course),
    );
    lessonRepository = module.get<Repository<Lesson>>(
      getRepositoryToken(Lesson),
    );
    moduleRepository = module.get<Repository<CourseModule>>(
      getRepositoryToken(CourseModule),
    );
  });

  describe('updateLessonProgress', () => {
    it('should create new progress record if none exists', async () => {
      jest.spyOn(lessonRepository, 'findOne').mockResolvedValue(mockLesson as any);
      jest.spyOn(progressRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(progressRepository, 'create').mockReturnValue(mockUserProgress as any);
      jest.spyOn(progressRepository, 'save').mockResolvedValue(mockUserProgress as any);

      const result = await service.updateLessonProgress(
        'user1',
        'course1',
        'lesson1',
        50,
      );

      expect(result).toBeDefined();
      expect(progressRepository.create).toHaveBeenCalled();
      expect(progressRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if lesson not found', async () => {
      jest.spyOn(lessonRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.updateLessonProgress('user1', 'course1', 'lesson1', 50),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if lesson does not belong to course', async () => {
      jest.spyOn(lessonRepository, 'findOne').mockResolvedValue({
        ...mockLesson,
        module: { id: 'module1', courseId: 'different-course' },
      } as any);

      await expect(
        service.updateLessonProgress('user1', 'course1', 'lesson1', 50),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getCourseProgress', () => {
    it('should return course progress with module details', async () => {
      jest.spyOn(courseRepository, 'findOne').mockResolvedValue(mockCourse as any);
      jest.spyOn(progressRepository, 'find').mockResolvedValue([
        {
          ...mockUserProgress,
          isCompleted: true,
          progressPercentage: 100,
        },
      ] as any);

      const result = await service.getCourseProgress('user1', 'course1');

      expect(result).toBeDefined();
      expect(result.overallProgress).toBe(50); // 1 completed out of 2 lessons
      expect(result.moduleProgress).toHaveLength(1);
      expect(result.moduleProgress[0].progress).toBe(50);
    });

    it('should throw NotFoundException if course not found', async () => {
      jest.spyOn(courseRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.getCourseProgress('user1', 'course1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUserProgress', () => {
    it('should return user progress across all courses', async () => {
      const mockProgress = [
        {
          ...mockUserProgress,
          course: { id: 'course1', title: 'Course 1' },
          lastAccessedAt: new Date(),
        },
      ];

      jest.spyOn(progressRepository, 'find').mockResolvedValue(mockProgress as any);

      const result = await service.getUserProgress('user1');

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].courseId).toBe('course1');
    });
  });

  describe('syncProgress', () => {
    it('should sync progress for all modules in a course', async () => {
      jest.spyOn(courseRepository, 'findOne').mockResolvedValue(mockCourse as any);
      jest.spyOn(moduleRepository, 'findOne').mockResolvedValue(mockCourse.modules[0] as any);
      jest.spyOn(progressRepository, 'find').mockResolvedValue([]);
      jest.spyOn(progressRepository, 'save').mockResolvedValue({} as any);

      await service.syncProgress('user1', 'course1');

      expect(moduleRepository.findOne).toHaveBeenCalled();
      expect(progressRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if course not found', async () => {
      jest.spyOn(courseRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.syncProgress('user1', 'course1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
}); 