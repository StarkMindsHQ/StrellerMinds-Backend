import { Test, type TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';

import { RealTimeAnalyticsService } from '../services/real-time-analytics.service';
import { AnalyticsGateway } from '../gateways/analytics.gateway';
import { EventType } from '../entities/analytics-event.entity';

describe('RealTimeAnalyticsService', () => {
  let service: RealTimeAnalyticsService;
  let analyticsGateway: jest.Mocked<AnalyticsGateway>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RealTimeAnalyticsService,
        {
          provide: AnalyticsGateway,
          useValue: {
            emitRealTimeEvent: jest.fn(),
            emitRealTimeMetrics: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RealTimeAnalyticsService>(RealTimeAnalyticsService);
    analyticsGateway = module.get(AnalyticsGateway);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processRealTimeEvent', () => {
    it('should process real-time event successfully', async () => {
      const eventData = {
        eventType: EventType.USER_ACTION,
        eventName: 'button_click',
        userId: 'user123',
        properties: { button: 'submit' },
        source: 'web',
        channel: 'organic',
      };

      await service.processRealTimeEvent(eventData);

      expect(analyticsGateway.emitRealTimeEvent).toHaveBeenCalledWith({
        type: 'event',
        data: eventData,
        timestamp: expect.any(Date),
      });
    });
  });

  describe('getCurrentMetrics', () => {
    it('should return current metrics', async () => {
      const metrics = await service.getCurrentMetrics();
      expect(Array.isArray(metrics)).toBe(true);
    });
  });

  describe('getActiveUsers', () => {
    it('should return active users count', async () => {
      const count = await service.getActiveUsers();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getEventsPerSecond', () => {
    it('should return events per second', async () => {
      const eps = await service.getEventsPerSecond();
      expect(typeof eps).toBe('number');
      expect(eps).toBeGreaterThanOrEqual(0);
    });
  });
});
