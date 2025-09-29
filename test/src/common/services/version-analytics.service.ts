import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiUsageLog } from '../entities/api-usage-log.entity';

export interface ApiUsageData {
  version: string;
  endpoint: string;
  userAgent: string;
  timestamp: Date;
  deprecated: boolean;
}

@Injectable()
export class VersionAnalyticsService {
  constructor(
    @InjectRepository(ApiUsageLog)
    private apiUsageRepository: Repository<ApiUsageLog>,
  ) {}

  async trackApiUsage(data: ApiUsageData): Promise<void> {
    const log = this.apiUsageRepository.create(data);
    await this.apiUsageRepository.save(log);
  }

  async getVersionUsageStats(days: number = 30): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.apiUsageRepository
      .createQueryBuilder('log')
      .select(['log.version', 'COUNT(*) as usage_count'])
      .where('log.timestamp >= :startDate', { startDate })
      .groupBy('log.version')
      .orderBy('usage_count', 'DESC')
      .getRawMany();
  }

  async getDeprecatedEndpointUsage(): Promise<any> {
    return this.apiUsageRepository
      .createQueryBuilder('log')
      .select(['log.endpoint', 'log.version', 'COUNT(*) as usage_count'])
      .where('log.deprecated = :deprecated', { deprecated: true })
      .groupBy('log.endpoint, log.version')
      .orderBy('usage_count', 'DESC')
      .getRawMany();
  }
}
