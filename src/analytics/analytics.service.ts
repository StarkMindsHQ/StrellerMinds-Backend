import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { parse } from 'json2csv'; 
import { Analytics } from './entities/analytics.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Analytics)
    private readonly analyticsRepository: Repository<Analytics>,
  ) {}

  async getAllAnalytics(): Promise<Analytics[]> {
    return await this.analyticsRepository.find();
  }

  convertToCSV(data: Analytics[]): string {
    const fields = ['id', 'eventType', 'userId', 'courseId', 'additionalData', 'createdAt'];
    return parse(data, { fields });
  }

  async getUserEngagementTrends() {
    const rawData = await this.analyticsRepository.find();
  
    // Group events by date
    const trends = rawData.reduce((acc, entry) => {
      const dateKey = entry.createdAt.toISOString().split('T')[0]; // Extract YYYY-MM-DD
      acc[dateKey] = acc[dateKey] || { date: dateKey, count: 0 };
      acc[dateKey].count += 1;
      return acc;
    }, {});
  
    return Object.values(trends);
  }
  
}
