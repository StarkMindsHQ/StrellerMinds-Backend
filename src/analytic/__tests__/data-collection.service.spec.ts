import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bull';
import type { Repository } from 'typeorm';
import type { Queue } from 'bull';
import { jest } from '@jest/globals';

import { DataCollectionService, type EventData } from '../services/data-collection.service';
import { RealTimeAnalyticsService } from '../services/real-time-analytics.service';
import { AnalyticsEvent, EventType } from '../entities/analytics-event.entity';

describe('DataCollectionService', () => {
  let service: DataCollectionService;
  let repository: jest.Mocked<Repository<AnalyticsEvent>>;
  let queue: jest.Mocked<Queue>;
  let realTimeService: jest.Mocked<RealTimeAnalyticsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataCollectionService,
        {
          provide: getRepositoryToken(AnalyticsEvent),
          useValue: {
            createQueryBuilder: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getQueueToken('data-collection'),
          useValue: {
            add: jest.fn(),
            addBulk: jest.fn(),
          },
        },
        {
          provide: RealTimeAnalyticsService,
          useValue: {
            processRealTimeEvent: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DataCollectionService>(DataCollectionService);
    repository = module.get(getRepositoryToken(AnalyticsEvent));
    queue = module.get(getQueueToken('data-collection'));
    realTimeService = module.get(RealTimeAnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('trackEvent', () => {
    it('should track an event successfully', async () => {
      const eventData: EventData = {
        eventType: EventType.USER_ACTION,
        eventName: 'button_click',
        userId: 'user123',
        properties: { button: 'submit' },
      };

      queue.add.mockResolvedValue({} as any);
      realTimeService.processRealTimeEvent.mockResolvedValue();

      await service.trackEvent(eventData);

      expect(queue.add).toHaveBeenCalledWith('process-event', {
        ...eventData,
        timestamp: expect.any(Date),
      });
      expect(realTimeService.processRealTimeEvent).toHaveBeenCalledWith(eventData);
    });

    it('should handle tracking errors', async () => {
      const eventData: EventData = {
        eventType: EventType.USER_ACTION,
        eventName: 'button_click',
        userId: 'user123',
        properties: { button: 'submit' },
      };

      queue.add.mockRejectedValue(new Error('Queue error'));

      await expect(service.trackEvent(eventData)).rejects.toThrow('Queue error');
    });
  });

  describe('batchTrackEvents', () => {
    it('should track multiple events successfully', async () => {
      const events: EventData[] = [
        {
          eventType: EventType.USER_ACTION,
          eventName: 'button_click',
          userId: 'user123',
          properties: { button: 'submit' },
        },
        {
          eventType: EventType.SYSTEM_EVENT,
          eventName: 'page_load',
          userId: 'user123',
          properties: { page: '/dashboard' },
        },
      ];

      queue.addBulk.mockResolvedValue([{} as any, {} as any]);
      realTimeService.processRealTimeEvent.mockResolvedValue();

      await service.batchTrackEvents(events);

      expect(queue.addBulk).toHaveBeenCalledWith(
        events.map((event) => ({
          name: 'process-event',
          data: {
            ...event,
            timestamp: expect.any(Date),
          },
        })),
      );
      expect(realTimeService.processRealTimeEvent).toHaveBeenCalledTimes(2);
    });
  });

  describe('getEvents', () => {
    it('should retrieve events with filters', async () => {
      const mockEvents = [
        {
          id: '1',
          eventType: EventType.USER_ACTION,
          eventName: 'button_click',
          userId: 'user123',
          properties: {},
          timestamp: new Date(),
        },
      ];

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockEvents, 1]),
      };

      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getEvents({
        eventType: EventType.USER_ACTION,
        userId: 'user123',
        limit: 10,
      });

      expect(result.events).toEqual(mockEvents);
      expect(result.total).toBe(1);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('event.eventType = :eventType', {
        eventType: EventType.USER_ACTION,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('event.userId = :userId', {
        userId: 'user123',
      });
    });
  });
});
