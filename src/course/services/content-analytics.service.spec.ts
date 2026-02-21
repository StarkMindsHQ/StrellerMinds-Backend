import { NotFoundException } from '@nestjs/common';
import { ContentAnalyticsService } from './content-analytics.service';

describe('ContentAnalyticsService', () => {
  let service: ContentAnalyticsService;
  let contentRepo: any;
  let analyticsRepo: any;

  beforeEach(() => {
    contentRepo = {
      findOne: jest.fn(),
    };
    analyticsRepo = {
      create: jest.fn((v) => v),
      save: jest.fn((v) => Promise.resolve(v)),
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    service = new ContentAnalyticsService(contentRepo, analyticsRepo);
  });

  it('tracks analytics with computed engagement score', async () => {
    contentRepo.findOne.mockResolvedValue({ id: 'c1' });
    const event = await service.trackEngagement('c1', {
      completionPercent: 80,
      interactions: 4,
      viewDurationSeconds: 300,
    });

    expect(event.engagementScore).toBeGreaterThan(0);
    expect(analyticsRepo.save).toHaveBeenCalled();
  });

  it('returns zeroed summary when no events exist', async () => {
    contentRepo.findOne.mockResolvedValue({ id: 'c1' });
    analyticsRepo.find.mockResolvedValue([]);

    const summary = await service.getEngagementSummary('c1');
    expect(summary.totalEvents).toBe(0);
  });

  it('throws for unknown content', async () => {
    contentRepo.findOne.mockResolvedValue(null);
    await expect(service.getEngagementSummary('missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
