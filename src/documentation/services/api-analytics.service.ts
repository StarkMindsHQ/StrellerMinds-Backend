import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ApiUsage } from '../entities/api-usage.entity';
import { ApiKey } from '../entities/api-key.entity';
import { ApiAnalyticsQueryDto, ApiAnalyticsResponseDto } from '../dto/analytics.dto';

@Injectable()
export class ApiAnalyticsService {
  private readonly logger = new Logger(ApiAnalyticsService.name);

  constructor(
    @InjectRepository(ApiUsage)
    private usageRepository: Repository<ApiUsage>,
    @InjectRepository(ApiKey)
    private apiKeyRepository: Repository<ApiKey>,
  ) {}

  /**
   * Track API usage
   */
  async trackUsage(
    apiKeyId: string,
    endpoint: string,
    method: string,
    statusCode: number,
    responseTime: number,
    metadata?: {
      requestSize?: number;
      responseSize?: number;
      userAgent?: string;
      ipAddress?: string;
      queryParams?: Record<string, any>;
      requestHeaders?: Record<string, any>;
      errorDetails?: any;
    },
  ): Promise<void> {
    try {
      const usage = this.usageRepository.create({
        apiKeyId,
        endpoint,
        method: method as any,
        statusCode,
        responseTime,
        ...metadata,
      });

      await this.usageRepository.save(usage);
    } catch (error) {
      this.logger.error(`Failed to track API usage: ${error.message}`);
    }
  }

  /**
   * Get analytics
   */
  async getAnalytics(query: ApiAnalyticsQueryDto): Promise<ApiAnalyticsResponseDto> {
    const startDate = query.startDate ? new Date(query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = query.endDate ? new Date(query.endDate) : new Date();

    const where: any = {
      timestamp: Between(startDate, endDate),
    };

    if (query.apiKeyId) where.apiKeyId = query.apiKeyId;
    if (query.endpoint) where.endpoint = query.endpoint;
    if (query.method) where.method = query.method;
    if (query.statusCode) where.statusCode = parseInt(query.statusCode);

    const usages = await this.usageRepository.find({ where, order: { timestamp: 'ASC' } });

    // Calculate statistics
    const totalRequests = usages.length;
    const uniqueApiKeys = new Set(usages.map((u) => u.apiKeyId)).size;
    const averageResponseTime =
      usages.length > 0 ? usages.reduce((sum, u) => sum + u.responseTime, 0) / usages.length : 0;
    const errorCount = usages.filter((u) => u.statusCode >= 400).length;
    const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0;

    // Requests by endpoint
    const endpointMap = new Map<string, { count: number; totalTime: number; errors: number }>();
    usages.forEach((usage) => {
      const key = `${usage.method} ${usage.endpoint}`;
      const existing = endpointMap.get(key) || { count: 0, totalTime: 0, errors: 0 };
      existing.count += 1;
      existing.totalTime += usage.responseTime;
      if (usage.statusCode >= 400) existing.errors += 1;
      endpointMap.set(key, existing);
    });

    const requestsByEndpoint = Array.from(endpointMap.entries()).map(([key, data]) => {
      const [method, endpoint] = key.split(' ');
      return {
        endpoint,
        method,
        count: data.count,
        averageResponseTime: data.totalTime / data.count,
        errorCount: data.errors,
      };
    });

    // Requests by status code
    const statusMap = new Map<number, number>();
    usages.forEach((usage) => {
      statusMap.set(usage.statusCode, (statusMap.get(usage.statusCode) || 0) + 1);
    });

    const requestsByStatus: Record<string, number> = {};
    statusMap.forEach((count, status) => {
      requestsByStatus[status.toString()] = count;
    });

    // Requests over time (hourly aggregation)
    const timeMap = new Map<string, { count: number; totalTime: number }>();
    usages.forEach((usage) => {
      const hour = new Date(usage.timestamp);
      hour.setMinutes(0, 0, 0);
      const key = hour.toISOString();
      const existing = timeMap.get(key) || { count: 0, totalTime: 0 };
      existing.count += 1;
      existing.totalTime += usage.responseTime;
      timeMap.set(key, existing);
    });

    const requestsOverTime = Array.from(timeMap.entries())
      .map(([timestamp, data]) => ({
        timestamp: new Date(timestamp),
        count: data.count,
        averageResponseTime: data.totalTime / data.count,
      }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Top API keys
    const keyMap = new Map<string, number>();
    usages.forEach((usage) => {
      keyMap.set(usage.apiKeyId, (keyMap.get(usage.apiKeyId) || 0) + 1);
    });

    const topApiKeys = await Promise.all(
      Array.from(keyMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(async ([apiKeyId, count]) => {
          const key = await this.apiKeyRepository.findOne({ where: { id: apiKeyId } });
          return {
            apiKeyId,
            name: key?.name || 'Unknown',
            requestCount: count,
          };
        }),
    );

    return {
      totalRequests,
      uniqueApiKeys,
      averageResponseTime: Math.round(averageResponseTime),
      errorRate: Math.round(errorRate * 100) / 100,
      requestsByEndpoint,
      requestsByStatus,
      requestsOverTime,
      topApiKeys,
    };
  }

  /**
   * Get endpoint analytics
   */
  async getEndpointAnalytics(endpoint: string, method: string, timeRange?: { start: Date; end: Date }) {
    const start = timeRange?.start || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = timeRange?.end || new Date();

    const usages = await this.usageRepository.find({
      where: {
        endpoint,
        method: method as any,
        timestamp: Between(start, end),
      },
      order: { timestamp: 'ASC' },
    });

    if (usages.length === 0) {
      return {
        endpoint,
        method,
        totalRequests: 0,
        averageResponseTime: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        errorRate: 0,
        requestsOverTime: [],
      };
    }

    const responseTimes = usages.map((u) => u.responseTime).sort((a, b) => a - b);
    const errors = usages.filter((u) => u.statusCode >= 400).length;

    return {
      endpoint,
      method,
      totalRequests: usages.length,
      averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      p50: responseTimes[Math.floor(responseTimes.length * 0.5)],
      p95: responseTimes[Math.floor(responseTimes.length * 0.95)],
      p99: responseTimes[Math.floor(responseTimes.length * 0.99)],
      errorRate: (errors / usages.length) * 100,
      requestsOverTime: this.aggregateByTime(usages),
    };
  }

  /**
   * Aggregate usage by time
   */
  private aggregateByTime(usages: ApiUsage[], interval: 'hour' | 'day' = 'hour'): Array<{ timestamp: Date; count: number }> {
    const map = new Map<string, number>();
    const intervalMs = interval === 'hour' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

    usages.forEach((usage) => {
      const time = new Date(usage.timestamp);
      time.setMilliseconds(0);
      if (interval === 'hour') {
        time.setMinutes(0, 0, 0);
      } else {
        time.setHours(0, 0, 0, 0);
      }
      const key = time.toISOString();
      map.set(key, (map.get(key) || 0) + 1);
    });

    return Array.from(map.entries())
      .map(([timestamp, count]) => ({
        timestamp: new Date(timestamp),
        count,
      }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }
}
