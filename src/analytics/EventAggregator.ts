import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalyticsEvent } from './StreamProcessor';
import * as Redis from 'ioredis';

export interface AggregationRule {
  name: string;
  eventType: string;
  service?: string;
  timeWindow: number; // in minutes
  groupBy: string[];
  aggregations: {
    [key: string]: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'distinct';
  };
  filters?: Record<string, any>;
  enabled: boolean;
}

export interface AggregatedData {
  ruleName: string;
  timestamp: Date;
  windowStart: Date;
  windowEnd: Date;
  dimensions: Record<string, any>;
  metrics: Record<string, number>;
  eventCount: number;
}

export interface AggregationResult {
  ruleName: string;
  success: boolean;
  processed: number;
  aggregated: number;
  duration: number;
  error?: string;
}

@Injectable()
export class EventAggregator {
  private readonly logger = new Logger(EventAggregator.name);
  private aggregationRules: Map<string, AggregationRule> = new Map();
  private redis: Redis.Redis;
  private aggregationBuffer: Map<string, AnalyticsEvent[]> = new Map();
  private processingIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    @InjectRepository(AggregatedData)
    private aggregatedDataRepository: Repository<AggregatedData>,
  ) {
    this.redis = new Redis.Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    });

    this.initializeDefaultRules();
  }

  async onModuleInit() {
    this.logger.log('Initializing Event Aggregator...');
    await this.startAggregationProcesses();
  }

  async onModuleDestroy() {
    this.logger.log('Shutting down Event Aggregator...');
    
    // Clear all intervals
    for (const interval of this.processingIntervals.values()) {
      clearInterval(interval);
    }
    
    if (this.redis) {
      await this.redis.quit();
    }
  }

  async addEvent(event: AnalyticsEvent): Promise<void> {
    // Find matching aggregation rules
    const matchingRules = this.findMatchingRules(event);
    
    for (const rule of matchingRules) {
      if (!rule.enabled) continue;
      
      const bufferKey = this.getBufferKey(rule);
      
      if (!this.aggregationBuffer.has(bufferKey)) {
        this.aggregationBuffer.set(bufferKey, []);
      }
      
      this.aggregationBuffer.get(bufferKey)!.push(event);
      
      // Limit buffer size to prevent memory issues
      const buffer = this.aggregationBuffer.get(bufferKey)!;
      if (buffer.length > 10000) {
        buffer.splice(0, 5000); // Remove oldest 5000 events
      }
    }
  }

  async addAggregationRule(rule: AggregationRule): Promise<void> {
    this.aggregationRules.set(rule.name, rule);
    
    // Start processing interval for this rule
    await this.startAggregationProcess(rule);
    
    this.logger.log(`Added aggregation rule: ${rule.name}`);
  }

  async removeAggregationRule(ruleName: string): Promise<void> {
    this.aggregationRules.delete(ruleName);
    
    // Clear processing interval
    const interval = this.processingIntervals.get(ruleName);
    if (interval) {
      clearInterval(interval);
      this.processingIntervals.delete(ruleName);
    }
    
    // Clear buffer
    this.aggregationBuffer.delete(this.getBufferKey({ name: ruleName } as AggregationRule));
    
    this.logger.log(`Removed aggregation rule: ${ruleName}`);
  }

  async updateAggregationRule(ruleName: string, updates: Partial<AggregationRule>): Promise<void> {
    const rule = this.aggregationRules.get(ruleName);
    if (!rule) {
      throw new Error(`Aggregation rule not found: ${ruleName}`);
    }
    
    Object.assign(rule, updates);
    
    // Restart processing if time window changed
    if (updates.timeWindow) {
      await this.restartAggregationProcess(rule);
    }
    
    this.logger.log(`Updated aggregation rule: ${ruleName}`);
  }

  async getAggregatedData(
    ruleName: string,
    startTime?: Date,
    endTime?: Date,
    dimensions?: Record<string, any>,
  ): Promise<AggregatedData[]> {
    const queryBuilder = this.aggregatedDataRepository
      .createQueryBuilder('data')
      .where('data.ruleName = :ruleName', { ruleName });

    if (startTime) {
      queryBuilder.andWhere('data.windowStart >= :startTime', { startTime });
    }

    if (endTime) {
      queryBuilder.andWhere('data.windowEnd <= :endTime', { endTime });
    }

    if (dimensions) {
      for (const [key, value] of Object.entries(dimensions)) {
        queryBuilder.andWhere(`data.dimensions->>'${key}' = :${key}`, { [key]: value });
      }
    }

    queryBuilder.orderBy('data.windowStart', 'DESC');

    return queryBuilder.getMany();
  }

  async getRealTimeMetrics(ruleName: string): Promise<Record<string, any>> {
    const rule = this.aggregationRules.get(ruleName);
    if (!rule) {
      throw new Error(`Aggregation rule not found: ${ruleName}`);
    }

    const bufferKey = this.getBufferKey(rule);
    const events = this.aggregationBuffer.get(bufferKey) || [];
    
    // Calculate real-time metrics from buffer
    const metrics = this.calculateMetrics(events, rule);
    
    return {
      ruleName,
      timestamp: new Date(),
      bufferEvents: events.length,
      metrics,
      windowStart: new Date(Date.now() - rule.timeWindow * 60 * 1000),
      windowEnd: new Date(),
    };
  }

  async forceAggregation(ruleName: string): Promise<AggregationResult> {
    const rule = this.aggregationRules.get(ruleName);
    if (!rule) {
      throw new Error(`Aggregation rule not found: ${ruleName}`);
    }

    const bufferKey = this.getBufferKey(rule);
    const events = this.aggregationBuffer.get(bufferKey) || [];
    
    return this.performAggregation(rule, events);
  }

  async getAggregationStats(): Promise<Record<string, any>> {
    const stats = {
      totalRules: this.aggregationRules.size,
      activeRules: 0,
      totalBufferedEvents: 0,
      rules: [] as Array<{
        name: string;
        enabled: boolean;
        bufferedEvents: number;
        timeWindow: number;
      }>,
    };

    for (const [name, rule] of this.aggregationRules) {
      const bufferKey = this.getBufferKey(rule);
      const eventCount = this.aggregationBuffer.get(bufferKey)?.length || 0;
      
      if (rule.enabled) stats.activeRules++;
      stats.totalBufferedEvents += eventCount;
      
      stats.rules.push({
        name,
        enabled: rule.enabled,
        bufferedEvents: eventCount,
        timeWindow: rule.timeWindow,
      });
    }

    return stats;
  }

  private findMatchingRules(event: AnalyticsEvent): AggregationRule[] {
    const matchingRules: AggregationRule[] = [];
    
    for (const rule of this.aggregationRules.values()) {
      if (!rule.enabled) continue;
      
      // Check event type
      if (rule.eventType !== event.type) continue;
      
      // Check service
      if (rule.service && rule.service !== event.service) continue;
      
      // Check filters
      if (rule.filters && !this.matchesFilters(event, rule.filters)) continue;
      
      matchingRules.push(rule);
    }
    
    return matchingRules;
  }

  private matchesFilters(event: AnalyticsEvent, filters: Record<string, any>): boolean {
    for (const [key, value] of Object.entries(filters)) {
      if (key === 'userId' && event.userId !== value) return false;
      if (key === 'sessionId' && event.sessionId !== value) return false;
      if (key.startsWith('data.') && event.data[key.slice(5)] !== value) return false;
    }
    return true;
  }

  private async startAggregationProcesses(): Promise<void> {
    for (const rule of this.aggregationRules.values()) {
      await this.startAggregationProcess(rule);
    }
  }

  private async startAggregationProcess(rule: AggregationRule): Promise<void> {
    const intervalMs = rule.timeWindow * 60 * 1000; // Convert minutes to milliseconds
    
    const interval = setInterval(async () => {
      await this.processAggregation(rule);
    }, intervalMs);
    
    this.processingIntervals.set(rule.name, interval);
  }

  private async restartAggregationProcess(rule: AggregationRule): Promise<void> {
    // Clear existing interval
    const existingInterval = this.processingIntervals.get(rule.name);
    if (existingInterval) {
      clearInterval(existingInterval);
    }
    
    // Start new interval
    await this.startAggregationProcess(rule);
  }

  private async processAggregation(rule: AggregationRule): Promise<void> {
    const bufferKey = this.getBufferKey(rule);
    const events = this.aggregationBuffer.get(bufferKey) || [];
    
    if (events.length === 0) return;
    
    try {
      const result = await this.performAggregation(rule, events);
      
      if (result.success) {
        // Clear processed events from buffer
        this.aggregationBuffer.set(bufferKey, []);
        
        this.logger.log(`Aggregated ${result.aggregated} events for rule: ${rule.name}`);
      } else {
        this.logger.error(`Aggregation failed for rule: ${rule.name}`, result.error);
      }
    } catch (error) {
      this.logger.error(`Aggregation process error for rule: ${rule.name}`, error);
    }
  }

  private async performAggregation(rule: AggregationRule, events: AnalyticsEvent[]): Promise<AggregationResult> {
    const startTime = Date.now();
    
    try {
      // Filter events within time window
      const windowStart = new Date(Date.now() - rule.timeWindow * 60 * 1000);
      const windowEnd = new Date();
      
      const windowEvents = events.filter(event => 
        event.timestamp >= windowStart && event.timestamp <= windowEnd
      );
      
      if (windowEvents.length === 0) {
        return {
          ruleName: rule.name,
          success: true,
          processed: events.length,
          aggregated: 0,
          duration: Date.now() - startTime,
        };
      }
      
      // Group events by dimensions
      const groupedEvents = this.groupEvents(windowEvents, rule.groupBy);
      
      // Perform aggregations for each group
      const aggregatedData: AggregatedData[] = [];
      
      for (const [dimensionKey, groupEvents] of Object.entries(groupedEvents)) {
        const dimensions = this.parseDimensionKey(dimensionKey, rule.groupBy);
        const metrics = this.calculateMetrics(groupEvents, rule);
        
        const data: AggregatedData = {
          ruleName: rule.name,
          timestamp: new Date(),
          windowStart,
          windowEnd,
          dimensions,
          metrics,
          eventCount: groupEvents.length,
        };
        
        aggregatedData.push(data);
      }
      
      // Save aggregated data
      await this.saveAggregatedData(aggregatedData);
      
      // Cache latest metrics in Redis for quick access
      await this.cacheLatestMetrics(rule.name, aggregatedData);
      
      return {
        ruleName: rule.name,
        success: true,
        processed: events.length,
        aggregated: windowEvents.length,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        ruleName: rule.name,
        success: false,
        processed: events.length,
        aggregated: 0,
        duration: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  private groupEvents(events: AnalyticsEvent[], groupBy: string[]): Record<string, AnalyticsEvent[]> {
    const groups: Record<string, AnalyticsEvent[]> = {};
    
    for (const event of events) {
      const dimensionValues = groupBy.map(dim => this.getDimensionValue(event, dim));
      const key = dimensionValues.join('|');
      
      if (!groups[key]) {
        groups[key] = [];
      }
      
      groups[key].push(event);
    }
    
    return groups;
  }

  private getDimensionValue(event: AnalyticsEvent, dimension: string): string {
    if (dimension === 'userId') return event.userId || 'null';
    if (dimension === 'sessionId') return event.sessionId || 'null';
    if (dimension === 'service') return event.service;
    if (dimension === 'type') return event.type;
    if (dimension.startsWith('data.')) {
      return String(event.data[dimension.slice(5)] || 'null');
    }
    return 'null';
  }

  private parseDimensionKey(key: string, groupBy: string[]): Record<string, any> {
    const values = key.split('|');
    const dimensions: Record<string, any> = {};
    
    for (let i = 0; i < groupBy.length; i++) {
      dimensions[groupBy[i]] = values[i] === 'null' ? null : values[i];
    }
    
    return dimensions;
  }

  private calculateMetrics(events: AnalyticsEvent[], rule: AggregationRule): Record<string, number> {
    const metrics: Record<string, number> = {};
    
    for (const [metricKey, aggregationType] of Object.entries(rule.aggregations)) {
      const values = events.map(event => this.extractValue(event, metricKey));
      
      switch (aggregationType) {
        case 'count':
          metrics[metricKey] = values.length;
          break;
        case 'sum':
          metrics[metricKey] = values.reduce((sum, val) => sum + (Number(val) || 0), 0);
          break;
        case 'avg':
          metrics[metricKey] = values.length > 0 
            ? values.reduce((sum, val) => sum + (Number(val) || 0), 0) / values.length 
            : 0;
          break;
        case 'min':
          metrics[metricKey] = values.length > 0 ? Math.min(...values.map(Number)) : 0;
          break;
        case 'max':
          metrics[metricKey] = values.length > 0 ? Math.max(...values.map(Number)) : 0;
          break;
        case 'distinct':
          metrics[metricKey] = new Set(values).size;
          break;
      }
    }
    
    return metrics;
  }

  private extractValue(event: AnalyticsEvent, path: string): any {
    if (path === 'userId') return event.userId;
    if (path === 'sessionId') return event.sessionId;
    if (path === 'service') return event.service;
    if (path === 'type') return event.type;
    if (path.startsWith('data.')) {
      return event.data[path.slice(5)];
    }
    return null;
  }

  private async saveAggregatedData(data: AggregatedData[]): Promise<void> {
    // In a real implementation, this would save to database
    // For now, we'll just log and cache in Redis
    for (const item of data) {
      await this.redis.hset(
        `aggregated:${item.ruleName}:${item.windowStart.getTime()}`,
        'data', JSON.stringify(item)
      );
      
      // Set expiration based on time window
      await this.redis.expire(
        `aggregated:${item.ruleName}:${item.windowStart.getTime()}`,
        24 * 60 * 60 // 24 hours
      );
    }
  }

  private async cacheLatestMetrics(ruleName: string, data: AggregatedData[]): Promise<void> {
    const latestData = data.reduce((latest, current) => {
      return current.timestamp > latest.timestamp ? current : latest;
    }, data[0]);

    await this.redis.setex(
      `latest_metrics:${ruleName}`,
      60 * 60, // 1 hour
      JSON.stringify(latestData)
    );
  }

  private getBufferKey(rule: AggregationRule): string {
    return `buffer:${rule.name}`;
  }

  private initializeDefaultRules(): Promise<void> {
    const defaultRules: AggregationRule[] = [
      {
        name: 'user_activity_by_minute',
        eventType: 'user_action',
        timeWindow: 1,
        groupBy: ['userId', 'type'],
        aggregations: {
          'count': 'count',
          'data.duration': 'avg',
        },
        enabled: true,
      },
      {
        name: 'course_engagement_by_hour',
        eventType: 'course_interaction',
        timeWindow: 60,
        groupBy: ['data.courseId', 'type'],
        aggregations: {
          'count': 'count',
          'data.progress': 'avg',
          'data.completionRate': 'avg',
        },
        enabled: true,
      },
      {
        name: 'payment_transactions_by_hour',
        eventType: 'payment_transaction',
        timeWindow: 60,
        groupBy: ['data.status', 'data.method'],
        aggregations: {
          'count': 'count',
          'data.amount': 'sum',
          'data.amount': 'avg',
        },
        enabled: true,
      },
      {
        name: 'error_rate_by_minute',
        eventType: 'error_occurred',
        timeWindow: 1,
        groupBy: ['service', 'data.severity'],
        aggregations: {
          'count': 'count',
          'data.responseTime': 'avg',
        },
        enabled: true,
      },
      {
        name: 'api_performance_by_minute',
        eventType: 'api_request',
        timeWindow: 1,
        groupBy: ['service', 'data.endpoint', 'data.method'],
        aggregations: {
          'count': 'count',
          'data.responseTime': 'avg',
          'data.responseTime': 'min',
          'data.responseTime': 'max',
          'data.statusCode': 'distinct',
        },
        enabled: true,
      },
    ];

    for (const rule of defaultRules) {
      this.aggregationRules.set(rule.name, rule);
    }

    this.logger.log(`Initialized ${defaultRules.length} default aggregation rules`);
    return Promise.resolve();
  }

  async getAggregationRules(): Promise<AggregationRule[]> {
    return Array.from(this.aggregationRules.values());
  }

  async enableRule(ruleName: string): Promise<void> {
    const rule = this.aggregationRules.get(ruleName);
    if (rule) {
      rule.enabled = true;
      await this.startAggregationProcess(rule);
    }
  }

  async disableRule(ruleName: string): Promise<void> {
    const rule = this.aggregationRules.get(ruleName);
    if (rule) {
      rule.enabled = false;
      const interval = this.processingIntervals.get(ruleName);
      if (interval) {
        clearInterval(interval);
        this.processingIntervals.delete(ruleName);
      }
    }
  }
}
