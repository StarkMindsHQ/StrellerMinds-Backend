import { Test, TestingModule } from '@nestjs/testing';
import { UserPreferencesController } from './user-preferences.controller';
import { UserPreferencesService } from './user-preferences.service';
import { CreateUserPreferencesDto } from './dtos/create-user-preferences.dto';
import { NotFoundException } from '@nestjs/common';

const mockPreferences = {
  id: 'pref-1',
  user: { id: 'user-1' },
  learningCustomization: {
    preferredTopics: ['Math'],
    learningPace: 'fast',
    learningGoals: 'Master Algebra',
  },
  notificationSettings: {
    emailEnabled: true,
    frequency: 'immediate',
    rules: { courseUpdate: true },
  },
  personalizationData: { theme: 'dark', language: 'en', accessibility: ['high-contrast'] },
  analytics: { lastUpdated: new Date(), usageStats: { create: 1 } },
};

describe('UserPreferencesController', () => {
  let controller: UserPreferencesController;
  let service: UserPreferencesService;

  const mockService = {
    create: jest.fn(),
    findByUserId: jest.fn(),
    update: jest.fn(),
    getCustomizedLearningPath: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserPreferencesController],
      providers: [{ provide: UserPreferencesService, useValue: mockService }],
    }).compile();

    controller = module.get<UserPreferencesController>(UserPreferencesController);
    service = module.get<UserPreferencesService>(UserPreferencesService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create user preferences', async () => {
      const dto: CreateUserPreferencesDto = {
        learningCustomization: { preferredTopics: ['Math'] },
      };
      mockService.create.mockResolvedValue(mockPreferences);
      const req = { body: { userId: 'user-1' } };
      const result = await controller.create(req, dto);
      expect(service.create).toHaveBeenCalledWith('user-1', dto);
      expect(result).toEqual(mockPreferences);
    });
  });

  describe('get', () => {
    it('should return user preferences', async () => {
      mockService.findByUserId.mockResolvedValue(mockPreferences);
      const result = await controller.get('user-1');
      expect(service.findByUserId).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(mockPreferences);
    });
    it('should throw NotFoundException if preferences not found', async () => {
      mockService.findByUserId.mockRejectedValue(new NotFoundException());
      await expect(controller.get('user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update user preferences', async () => {
      const dto: CreateUserPreferencesDto = {
        learningCustomization: { preferredTopics: ['Science'] },
      };
      mockService.update.mockResolvedValue({
        ...mockPreferences,
        learningCustomization: dto.learningCustomization,
      });
      const result = await controller.update('user-1', dto);
      expect(service.update).toHaveBeenCalledWith('user-1', dto);
      expect(result.learningCustomization.preferredTopics).toContain('Science');
    });
  });

  describe('getLearningPath', () => {
    it('should return customized learning path', async () => {
      const learningPath = { suggestedTopics: ['Math'], pace: 'fast', goals: 'Master Algebra' };
      mockService.getCustomizedLearningPath.mockResolvedValue(learningPath);
      const result = await controller.getLearningPath('user-1');
      expect(service.getCustomizedLearningPath).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(learningPath);
    });
  });
});
