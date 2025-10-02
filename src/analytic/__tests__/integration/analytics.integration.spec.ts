import { Test, type TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';

import { AnalyticsModule } from '../../analytics.module';
import { DataCollectionService } from '../../services/data-collection.service';
import { BusinessIntelligenceService } from '../../services/business-intelligence.service';
import { EventType } from '../../entities/analytics-event.entity';

describe('Analytics Integration', () => {
  let module: TestingModule;
  let dataCollectionService: DataCollectionService;
  let businessIntelligenceService: BusinessIntelligenceService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [__dirname + '/../../entities/*.entity{.ts,.js}'],
          synchronize: true,
        }),
        BullModule.forRoot({
          redis: {
            host: 'localhost',
            port: 6379,
          },
        }),
        ScheduleModule.forRoot(),
        AnalyticsModule,
      ],
    }).compile();

    dataCollectionService = module.get<DataCollectionService>(DataCollectionService);
    businessIntelligenceService = module.get<BusinessIntelligenceService>(
      BusinessIntelligenceService,
    );
  });

  afterAll(async () => {
    await module.close();
  });

  it('should track and query events end-to-end', async () => {
    // Track some events
    await dataCollectionService.trackEvent({
      eventType: EventType.USER_ACTION,
      eventName: 'button_click',
      userId: 'user123',
      properties: { button: 'submit' },
    });

    await dataCollectionService.trackEvent({
      eventType: EventType.USER_ACTION,
      eventName: 'page_view',
      userId: 'user123',
      properties: { page: '/dashboard' },
    });

    // Wait for processing
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Query events
    const events = await dataCollectionService.getEvents({
      userId: 'user123',
      limit: 10,
    });

    expect(events.total).toBeGreaterThan(0);
    expect(events.events[0].userId).toBe('user123');

    // Get user analytics
    const userAnalytics = await businessIntelligenceService.getUserAnalytics('user123', {
      start: new Date(Date.now() - 24 * 60 * 60 * 1000),
      end: new Date(),
    });

    expect(userAnalytics.userId).toBe('user123');
    expect(userAnalytics.totalEvents).toBeGreaterThan(0);
  }, 10000);
});
