import { Test, TestingModule } from '@nestjs/testing';
import { ProgressController } from './progress.controller';
import { ProgressService } from '../services/progress.service';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('ProgressController', () => {
  let controller: ProgressController;
  let service: ProgressService;

  const mockProgressService = {
    updateLessonProgress: jest.fn(),
    getCourseProgress: jest.fn(),
    getUserProgress: jest.fn(),
    syncProgress: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProgressController],
      providers: [
        {
          provide: ProgressService,
          useValue: mockProgressService,
        },
      ],
    }).compile();

    controller = module.get<ProgressController>(ProgressController);
    service = module.get<ProgressService>(ProgressService);
  });

  describe('updateLessonProgress', () => {
    const mockRequest = {
      user: { id: 'user1' },
    };

    const mockUpdateProgressDto = {
      progressPercentage: 50,
      metadata: { timeSpent: 1200 },
    };

    it('should update lesson progress successfully', async () => {
      const expectedResult = {
        id: '1',
        progressPercentage: 50,
        isCompleted: false,
      };

      mockProgressService.updateLessonProgress.mockResolvedValue(expectedResult);

      const result = await controller.updateLessonProgress(
        mockRequest,
        'course1',
        'lesson1',
        mockUpdateProgressDto,
      );

      expect(result).toEqual(expectedResult);
      expect(service.updateLessonProgress).toHaveBeenCalledWith('user1', 'course1', 'lesson1', 50, {
        timeSpent: 1200,
      });
    });

    it('should handle errors appropriately', async () => {
      mockProgressService.updateLessonProgress.mockRejectedValue(new Error('Database error'));

      await expect(
        controller.updateLessonProgress(mockRequest, 'course1', 'lesson1', mockUpdateProgressDto),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('getCourseProgress', () => {
    const mockRequest = {
      user: { id: 'user1' },
    };

    it('should return course progress successfully', async () => {
      const expectedResult = {
        overallProgress: 50,
        completedLessons: 1,
        totalLessons: 2,
        moduleProgress: [],
      };

      mockProgressService.getCourseProgress.mockResolvedValue(expectedResult);

      const result = await controller.getCourseProgress(mockRequest, 'course1');

      expect(result).toEqual(expectedResult);
      expect(service.getCourseProgress).toHaveBeenCalledWith('user1', 'course1');
    });

    it('should handle errors appropriately', async () => {
      mockProgressService.getCourseProgress.mockRejectedValue(new Error('Database error'));

      await expect(controller.getCourseProgress(mockRequest, 'course1')).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('getUserProgress', () => {
    const mockRequest = {
      user: { id: 'user1' },
    };

    it('should return user progress successfully', async () => {
      const expectedResult = [
        {
          courseId: 'course1',
          courseTitle: 'Course 1',
          progress: 50,
          lastAccessed: new Date(),
        },
      ];

      mockProgressService.getUserProgress.mockResolvedValue(expectedResult);

      const result = await controller.getUserProgress(mockRequest);

      expect(result).toEqual(expectedResult);
      expect(service.getUserProgress).toHaveBeenCalledWith('user1');
    });

    it('should handle errors appropriately', async () => {
      mockProgressService.getUserProgress.mockRejectedValue(new Error('Database error'));

      await expect(controller.getUserProgress(mockRequest)).rejects.toThrow(HttpException);
    });
  });

  describe('syncProgress', () => {
    const mockRequest = {
      user: { id: 'user1' },
    };

    it('should sync progress successfully', async () => {
      mockProgressService.syncProgress.mockResolvedValue(undefined);

      const result = await controller.syncProgress(mockRequest, 'course1');

      expect(result).toEqual({ message: 'Progress synchronized successfully' });
      expect(service.syncProgress).toHaveBeenCalledWith('user1', 'course1');
    });

    it('should handle errors appropriately', async () => {
      mockProgressService.syncProgress.mockRejectedValue(new Error('Database error'));

      await expect(controller.syncProgress(mockRequest, 'course1')).rejects.toThrow(HttpException);
    });
  });

  describe('getCourseProgressAdmin', () => {
    it('should return admin course progress successfully', async () => {
      const expectedResult = {
        overallProgress: 50,
        completedLessons: 1,
        totalLessons: 2,
        moduleProgress: [],
      };

      mockProgressService.getCourseProgress.mockResolvedValue(expectedResult);

      const result = await controller.getCourseProgressAdmin('course1');

      expect(result).toEqual(expectedResult);
      expect(service.getCourseProgress).toHaveBeenCalledWith('course1');
    });

    it('should handle errors appropriately', async () => {
      mockProgressService.getCourseProgress.mockRejectedValue(new Error('Database error'));

      await expect(controller.getCourseProgressAdmin('course1')).rejects.toThrow(HttpException);
    });
  });
});
