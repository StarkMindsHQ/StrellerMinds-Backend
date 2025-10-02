import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bull';
import type { Repository } from 'typeorm';
import type { Queue } from 'bull';
import { jest } from '@jest/globals';

import { PushNotificationService } from '../services/push-notification.service';
import { PushSubscription } from '../entities/push-subscription.entity';
import { NotificationTemplate } from '../entities/notification-template.entity';

describe('PushNotificationService', () => {
  let service: PushNotificationService;
  let subscriptionRepository: Repository<PushSubscription>;
  let templateRepository: Repository<NotificationTemplate>;
  let notificationQueue: Queue;

  const mockSubscriptionRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockTemplateRepository = {
    findOne: jest.fn(),
  };

  const mockQueue = {
    add: jest.fn(),
    addBulk: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PushNotificationService,
        {
          provide: getRepositoryToken(PushSubscription),
          useValue: mockSubscriptionRepository,
        },
        {
          provide: getRepositoryToken(NotificationTemplate),
          useValue: mockTemplateRepository,
        },
        {
          provide: getQueueToken('push-notifications'),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<PushNotificationService>(PushNotificationService);
    subscriptionRepository = module.get<Repository<PushSubscription>>(
      getRepositoryToken(PushSubscription),
    );
    templateRepository = module.get<Repository<NotificationTemplate>>(
      getRepositoryToken(NotificationTemplate),
    );
    notificationQueue = module.get<Queue>(getQueueToken('push-notifications'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSubscription', () => {
    it('should create a new subscription', async () => {
      const subscriptionDto = {
        userId: 'user123',
        subscription: {
          endpoint: 'https://example.com/push',
          keys: {
            p256dh: 'test-p256dh',
            auth: 'test-auth',
          },
        },
      };

      mockSubscriptionRepository.findOne.mockResolvedValue(null);
      mockSubscriptionRepository.create.mockReturnValue({ id: 'sub123' });
      mockSubscriptionRepository.save.mockResolvedValue({ id: 'sub123' });

      const result = await service.createSubscription(subscriptionDto);

      expect(mockSubscriptionRepository.findOne).toHaveBeenCalledWith({
        where: { endpoint: subscriptionDto.subscription.endpoint },
      });
      expect(mockSubscriptionRepository.create).toHaveBeenCalled();
      expect(mockSubscriptionRepository.save).toHaveBeenCalled();
      expect(result).toEqual({ id: 'sub123' });
    });

    it('should update existing subscription', async () => {
      const subscriptionDto = {
        userId: 'user123',
        subscription: {
          endpoint: 'https://example.com/push',
          keys: {
            p256dh: 'test-p256dh',
            auth: 'test-auth',
          },
        },
      };

      const existingSubscription = {
        id: 'sub123',
        endpoint: 'https://example.com/push',
        userId: 'user123',
      };

      mockSubscriptionRepository.findOne.mockResolvedValue(existingSubscription);
      mockSubscriptionRepository.save.mockResolvedValue(existingSubscription);

      const result = await service.createSubscription(subscriptionDto);

      expect(mockSubscriptionRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'sub123',
          isActive: true,
          failureCount: 0,
        }),
      );
    });
  });

  describe('sendNotification', () => {
    it('should queue notifications for active subscriptions', async () => {
      const notificationDto = {
        userIds: ['user123'],
        title: 'Test Notification',
        body: 'Test message',
      };

      const subscriptions = [
        {
          id: 'sub123',
          userId: 'user123',
          isActive: true,
          getSubscriptionData: () => ({
            endpoint: 'https://example.com/push',
            keys: { p256dh: 'test', auth: 'test' },
          }),
        },
      ];

      mockSubscriptionRepository.find.mockResolvedValue(subscriptions);
      mockQueue.addBulk.mockResolvedValue([]);

      const result = await service.sendNotification(notificationDto);

      expect(mockSubscriptionRepository.find).toHaveBeenCalled();
      expect(mockQueue.addBulk).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'send-push-notification',
            data: expect.objectContaining({
              subscriptionId: 'sub123',
            }),
          }),
        ]),
      );
      expect(result.queued).toBe(1);
    });

    it('should use notification template when specified', async () => {
      const notificationDto = {
        userIds: ['user123'],
        templateType: 'welcome',
        variables: { name: 'John' },
      };

      const template = {
        render: jest.fn().mockReturnValue({
          title: 'Welcome John!',
          body: 'Thanks for joining',
        }),
      };

      const subscriptions = [
        {
          id: 'sub123',
          getSubscriptionData: () => ({ endpoint: 'test', keys: {} }),
        },
      ];

      mockTemplateRepository.findOne.mockResolvedValue(template);
      mockSubscriptionRepository.find.mockResolvedValue(subscriptions);
      mockQueue.addBulk.mockResolvedValue([]);

      await service.sendNotification(notificationDto);

      expect(mockTemplateRepository.findOne).toHaveBeenCalledWith({
        where: { type: 'welcome', isActive: true },
      });
      expect(template.render).toHaveBeenCalledWith({ name: 'John' });
    });
  });
});
