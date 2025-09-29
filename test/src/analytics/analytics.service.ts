import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { parse } from 'json2csv'; 
import { Analytics } from './entities/analytics.entity';

/**
 * AnalyticsService provides analytics data and reporting logic.
 */
@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Analytics)
    private readonly analyticsRepository: Repository<Analytics>,
  ) {}

  /**
   * Get all analytics records.
   */
  async getAllAnalytics(): Promise<Analytics[]> {
    return await this.analyticsRepository.find();
  }

  /**
   * Convert analytics data to CSV format.
   */
  convertToCSV(data: Analytics[]): string {
    const fields = ['id', 'eventType', 'userId', 'courseId', 'additionalData', 'createdAt'];
    return parse(data, { fields });
  }

  /**
   * Get user engagement trends.
   */
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

  /**
   * Get credential issuance analytics.
   */
  async getCredentialIssuance() {
    // Simulate query or on-chain fetch
    return { totalIssued: 512, byDate: { '2025-05-01': 32 } };
  }

  async getTransactionVolumes() {
    return {
      daily: [120, 100, 89, 132],
      monthly: [3000, 2800, 3400],
    };
  }

  async getCostAnalysis() {
    return {
      averageGasCost: 0.012,
      totalSpent: 35.6,
    };
  }

  async getUsageReports() {
    return {
      totalUsers: 1240,
      activeUsers: 410,
      reportDate: new Date().toISOString(),
    };
  }
}
