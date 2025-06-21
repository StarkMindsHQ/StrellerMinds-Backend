import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { PushNotificationService } from '../services/push-notification.service';
import { Notification } from '../entities/notification.entity';
import { DeviceToken } from '../entities/device-token.entity';
import { NotificationPreferences } from '../entities/notification-preferences.entity';
import { jest, expect } from '@jest/globals';

describe('PushNotificationService', () => {
  let service: PushNotificationService;
  let mockNotificationRepository: any;
  let mockDeviceTokenRepository: any;
  let mockPreferencesRepository: any;

  beforeEach(async () => {
    mockNotificationRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    };

    mockDeviceTokenRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    mockPreferencesRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PushNotificationService,
        ConfigService,
        {
          provide: getRepositoryToken(Notification),
          useValue: mockNotificationRepository,
        },
        {
          provide: getRepositoryToken(DeviceToken),
          useValue: mockDeviceTokenRepository,
        },
        {
          provide: getRepositoryToken(NotificationPreferences),
          useValue: mockPreferencesRepository,
        },
      ],
    }).compile();

    service = module.get<PushNotificationService>(PushNotificationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('registerDeviceToken', () => {
    it('should register a new device token', async () => {
      const userId = 'user123';
      const token = 'device-token-123';
      const platform = 'ios';

      mockDeviceTokenRepository.findOne.mockResolvedValue(null);
      mockDeviceTokenRepository.create.mockReturnValue({
        userId,
        token,
        platform,
        lastUsedAt: expect.any(Date),
      });
      mockDeviceTokenRepository.save.mockResolvedValue({
        id: 'token-id',
        userId,
        token,
        platform,
      });

      const result = await service.registerDeviceToken(userId, token, platform as any);

      expect(result).toEqual({
        id: 'token-id',
        userId,
        token,
        platform,
      });
      expect(mockDeviceTokenRepository.save).toHaveBeenCalled();
    });

    it('should update existing device token', async () => {
      const userId = 'user123';
      const token = 'device-token-123';
      const platform = 'ios';

      const existingToken = {
        id: 'existing-id',
        userId,
        token,
        platform,
        active: false,
      };

      mockDeviceTokenRepository.findOne.mockResolvedValue(existingToken);
      mockDeviceTokenRepository.save.mockResolvedValue({
        ...existingToken,
        active: true,
        lastUsedAt: expect.any(Date),
      });

      const result = await service.registerDeviceToken(userId, token, platform as any);

      expect(result.active).toBe(true);
      expect(mockDeviceTokenRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ active: true })
      );
    });
  });

  describe('updateUserPreferences', () => {
    it('should create new preferences if none exist', async () => {
      const userId = 'user123';
      const preferences = { courseUpdates: false, marketing: true };

      mockPreferencesRepository.findOne.mockResolvedValue(null);
      mockPreferencesRepository.create.mockReturnValue({ userId, ...preferences });
      mockPreferencesRepository.save.mockResolvedValue({ id: 'pref-id', userId, ...preferences });

      const result = await service.updateUserPreferences(userId, preferences);

      expect(result).toEqual({ id: 'pref-id', userId, ...preferences });
      expect(mockPreferencesRepository.create).toHaveBeenCalledWith({ userId, ...preferences });
    });

    it('should update existing preferences', async () => {
      const userId = 'user123';
      const existingPrefs = { id: 'pref-id', userId, courseUpdates: true };
      const updates = { courseUpdates: false, marketing: true };

      mockPreferencesRepository.findOne.mockResolvedValue(existingPrefs);
      mockPreferencesRepository.save.mockResolvedValue({ ...existingPrefs, ...updates });

      const result = await service.updateUserPreferences(userId, updates);

      expect(result.courseUpdates).toBe(false);
      expect(result.marketing).toBe(true);
    });
  });
});

function beforeEach(arg0: () => Promise<void>) {
    throw new Error('Function not implemented.');
}
