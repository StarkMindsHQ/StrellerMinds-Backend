import {
  Injectable,
  Inject,
  CACHE_MANAGER,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Cache } from 'cache-manager';
import { Cron } from '@nestjs/schedule';

import { AnalyticsEvent } from './entities/analytics-event.entity';
import { AnalyticsReport } from './entities/analytics-report.entity';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(AnalyticsEvent)
    private eventRepo: Repository<AnalyticsEvent>,

    @InjectRepository(AnalyticsReport)
    private reportRepo: Repository<AnalyticsReport>,

    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  // ---------------------------
  // EVENT TRACKING
  // ---------------------------
  async track(event: string, userId?: string, metadata?: any) {
    return this.eventRepo.save({ event, userId, metadata });
  }

  // ---------------------------
  // DASHBOARD OVERVIEW
  // ---------------------------
  async getOverview() {
    const cached = await this.cacheManager.get('analytics:overview');
    if (cached) return cached;

    const today = new Date(Date.now() - 86400000);

    const totalEvents = await this.eventRepo.count();
    const eventsToday = await this.eventRepo.count({
      where: { createdAt: MoreThan(today) },
    });

    const payload = {
      totalEvents,
      eventsToday,
    };

    await this.cacheManager.set('analytics:overview', payload, 60);
    return payload;
  }

  // ---------------------------
  // REPORTS
  // ---------------------------
  async createReport(data: Partial<AnalyticsReport>) {
    return this.reportRepo.save(data);
  }

  async generateReport(config: any) {
    // Example dynamic report
    const qb = this.eventRepo.createQueryBuilder('event');

    if (config.event) {
      qb.andWhere('event.event = :event', { event: config.event });
    }

    if (config.userId) {
      qb.andWhere('event.userId = :userId', { userId: config.userId });
    }

    const data = await qb.orderBy('event.createdAt', 'DESC').getMany();

    return {
      config,
      count: data.length,
      data,
    };
  }

  // ---------------------------
  // PREDICTIVE INSIGHTS (simple but extensible)
  // ---------------------------
  async predict(event: string) {
    const results = await this.eventRepo.find({
      where: { event },
      order: { createdAt: 'ASC' },
    });

    return {
      event,
      total: results.length,
      insight:
        results.length > 50
          ? 'High activity detected'
          : 'Low to moderate activity',
    };
  }

  // ---------------------------
  // SCHEDULED REPORTS
  // ---------------------------
  @Cron('0 */6 * * *') // every 6 hours
  async runScheduledReports() {
    const reports = await this.reportRepo.find({
      where: { scheduled: true },
    });

    for (const report of reports) {
      const result = await this.generateReport(report.config);
      this.logger.log(
        `Scheduled report executed: ${report.name} → ${result.count} rows`,
      );
    }
  }
}
