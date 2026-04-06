import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AggregatedData } from './EventAggregator';
import * as Redis from 'ioredis';

export interface MetricDefinition {
  name: string;
  description: string;
  type: 'counter' | 'gauge' | 'histogram' | 'rate' | 'ratio';
  unit: string;
  tags: string[];
  calculation: {
    source: string;
    formula: string;
    window: number; // in minutes
  };
  thresholds: {
    warning?: number;
    critical?: number;
  };
  enabled: boolean;
}

export interface CalculatedMetric {
  name: string;
  timestamp: Date;
  value: number;
  unit: string;
  tags: Record<string, string>;
  status: 'normal' | 'warning' | 'critical';
  threshold?: {
    warning?: number;
    critical?: number;
  };
  metadata: {
    calculationTime: number;
    dataSource: string;
    windowStart: Date;
    windowEnd: Date;
  };
}

export interface MetricAlert {
  metricName: string;
  status: 'warning' | 'critical';
  value: number;
  threshold: number;
  timestamp: Date;
  message: string;
  tags: Record<string, string>;
}

@Injectable()
export class MetricsCalculator {
  private readonly logger = new Logger(MetricsCalculator.name);
  private metricDefinitions: Map<string, MetricDefinition> = new Map();
  private redis: Redis.Redis;
  private calculationIntervals: Map<string, NodeJS.Timeout> = new Map();
  private metricCache: Map<string, CalculatedMetric> = new Map();

  constructor(
    @InjectRepository(CalculatedMetric)
    private metricsRepository: Repository<CalculatedMetric>,
  ) {
    this.redis = new Redis.Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    });

    this.initializeDefaultMetrics();
  }

  async onModuleInit() {
    this.logger.log('Initializing Metrics Calculator...');
    await this.startMetricCalculations();
  }

  async onModuleDestroy() {
    this.logger.log('Shutting down Metrics Calculator...');
    
    // Clear all intervals
    for (const interval of this.calculationIntervals.values()) {
      clearInterval(interval);
    }
    
    if (this.redis) {
      await this.redis.quit();
    }
  }

  async addMetricDefinition(definition: MetricDefinition): Promise<void> {
    this.metricDefinitions.set(definition.name, definition);
    
    // Start calculation interval for this metric
    await this.startMetricCalculation(definition);
    
    this.logger.log(`Added metric definition: ${definition.name}`);
  }

  async removeMetricDefinition(metricName: string): Promise<void> {
    this.metricDefinitions.delete(metricName);
    
    // Clear calculation interval
    const interval = this.calculationIntervals.get(metricName);
    if (interval) {
      clearInterval(interval);
      this.calculationIntervals.delete(metricName);
    }
    
    // Clear cache
    this.metricCache.delete(metricName);
    
    this.logger.log(`Removed metric definition: ${metricName}`);
  }

  async updateMetricDefinition(metricName: string, updates: Partial<MetricDefinition>): Promise<void> {
    const definition = this.metricDefinitions.get(metricName);
    if (!definition) {
      throw new Error(`Metric definition not found: ${metricName}`);
    }
    
    Object.assign(definition, updates);
    
    // Restart calculation if window changed
    if (updates.calculation?.window) {
      await this.restartMetricCalculation(definition);
    }
    
    this.logger.log(`Updated metric definition: ${metricName}`);
  }

  async calculateMetric(metricName: string, window?: number): Promise<CalculatedMetric> {
    const definition = this.metricDefinitions.get(metricName);
    if (!definition) {
      throw new Error(`Metric definition not found: ${metricName}`);
    }

    const calculationWindow = window || definition.calculation.window;
    const windowStart = new Date(Date.now() - calculationWindow * 60 * 1000);
    const windowEnd = new Date();
    
    const startTime = Date.now();
    
    try {
      const value = await this.performCalculation(definition, windowStart, windowEnd);
      const calculationTime = Date.now() - startTime;
      
      const metric: CalculatedMetric = {
        name: definition.name,
        timestamp: new Date(),
        value,
        unit: definition.unit,
        tags: this.generateTags(definition),
        status: this.evaluateStatus(value, definition.thresholds),
        threshold: definition.thresholds,
        metadata: {
          calculationTime,
          dataSource: definition.calculation.source,
          windowStart,
          windowEnd,
        },
      };
      
      // Cache the metric
      this.metricCache.set(metricName, metric);
      
      // Save to Redis for time series
      await this.saveMetricToRedis(metric);
      
      // Check for alerts
      await this.checkAlerts(metric);
      
      return metric;
    } catch (error) {
      this.logger.error(`Failed to calculate metric: ${metricName}`, error);
      throw error;
    }
  }

  async getMetric(
    metricName: string,
    startTime?: Date,
    endTime?: Date,
    tags?: Record<string, string>,
  ): Promise<CalculatedMetric[]> {
    // Try cache first for latest value
    if (!startTime && !endTime && !tags) {
      const cached = this.metricCache.get(metricName);
      if (cached) {
        return [cached];
      }
    }

    // Get from Redis time series
    return this.getMetricsFromRedis(metricName, startTime, endTime, tags);
  }

  async getMetricHistory(
    metricName: string,
    startTime: Date,
    endTime: Date,
    interval = '5m', // 5 minutes default
  ): Promise<Array<{ timestamp: Date; value: number }>> {
    const intervalMs = this.parseInterval(interval);
    const points: Array<{ timestamp: Date; value: number }> = [];
    
    for (let time = startTime.getTime(); time <= endTime.getTime(); time += intervalMs) {
      const pointStart = new Date(time);
      const pointEnd = new Date(time + intervalMs);
      
      try {
        const metric = await this.calculateMetric(metricName, intervalMs / (60 * 1000));
        points.push({
          timestamp: metric.timestamp,
          value: metric.value,
        });
      } catch (error) {
        // Skip points that can't be calculated
        continue;
      }
    }
    
    return points;
  }

  async getMetricsOverview(): Promise<Record<string, any>> {
    const overview = {
      totalMetrics: this.metricDefinitions.size,
      enabledMetrics: 0,
      cachedMetrics: this.metricCache.size,
      metrics: [] as Array<{
        name: string;
        type: string;
        unit: string;
        enabled: boolean;
        lastValue?: number;
        status?: string;
      }>,
    };

    for (const [name, definition] of this.metricDefinitions) {
      if (definition.enabled) overview.enabledMetrics++;
      
      const cached = this.metricCache.get(name);
      
      overview.metrics.push({
        name,
        type: definition.type,
        unit: definition.unit,
        enabled: definition.enabled,
        lastValue: cached?.value,
        status: cached?.status,
      });
    }

    return overview;
  }

  async createCustomMetric(
    name: string,
    formula: string,
    sourceMetrics: string[],
    window = 60,
    unit = 'count',
  ): Promise<MetricDefinition> {
    const definition: MetricDefinition = {
      name,
      description: `Custom metric: ${name}`,
      type: 'gauge',
      unit,
      tags: [],
      calculation: {
        source: sourceMetrics.join(','),
        formula,
        window,
      },
      thresholds: {},
      enabled: true,
    };

    await this.addMetricDefinition(definition);
    return definition;
  }

  async enableMetric(metricName: string): Promise<void> {
    const definition = this.metricDefinitions.get(metricName);
    if (definition) {
      definition.enabled = true;
      await this.startMetricCalculation(definition);
    }
  }

  async disableMetric(metricName: string): Promise<void> {
    const definition = this.metricDefinitions.get(metricName);
    if (definition) {
      definition.enabled = false;
      const interval = this.calculationIntervals.get(metricName);
      if (interval) {
        clearInterval(interval);
        this.calculationIntervals.delete(metricName);
      }
    }
  }

  private async startMetricCalculations(): Promise<void> {
    for (const definition of this.metricDefinitions.values()) {
      await this.startMetricCalculation(definition);
    }
  }

  private async startMetricCalculation(definition: MetricDefinition): Promise<void> {
    if (!definition.enabled) return;
    
    const intervalMs = definition.calculation.window * 60 * 1000; // Convert minutes to milliseconds
    
    const interval = setInterval(async () => {
      try {
        await this.calculateMetric(definition.name);
      } catch (error) {
        this.logger.error(`Scheduled calculation failed for metric: ${definition.name}`, error);
      }
    }, intervalMs);
    
    this.calculationIntervals.set(definition.name, interval);
  }

  private async restartMetricCalculation(definition: MetricDefinition): Promise<void> {
    // Clear existing interval
    const existingInterval = this.calculationIntervals.get(definition.name);
    if (existingInterval) {
      clearInterval(existingInterval);
    }
    
    // Start new interval
    await this.startMetricCalculation(definition);
  }

  private async performCalculation(
    definition: MetricDefinition,
    windowStart: Date,
    windowEnd: Date,
  ): Promise<number> {
    const source = definition.calculation.source;
    const formula = definition.calculation.formula;
    
    // Get source data
    const sourceData = await this.getSourceData(source, windowStart, windowEnd);
    
    // Apply formula
    return this.applyFormula(formula, sourceData, definition.type);
  }

  private async getSourceData(source: string, windowStart: Date, windowEnd: Date): Promise<Record<string, any>> {
    const data: Record<string, any> = {};
    
    // Check if source is aggregated data
    if (source.startsWith('aggregated:')) {
      const ruleName = source.replace('aggregated:', '');
      const aggregatedData = await this.getAggregatedData(ruleName, windowStart, windowEnd);
      
      data.aggregated = aggregatedData;
      data.count = aggregatedData.length;
      data.sum = aggregatedData.reduce((sum, item) => sum + (item.metrics.count || 0), 0);
      data.avg = data.count > 0 ? data.sum / data.count : 0;
    }
    
    // Check if source is Redis key pattern
    if (source.startsWith('redis:')) {
      const pattern = source.replace('redis:', '');
      const keys = await this.redis.keys(pattern);
      
      for (const key of keys) {
        const value = await this.redis.get(key);
        data[key] = value ? JSON.parse(value) : null;
      }
    }
    
    return data;
  }

  private applyFormula(formula: string, data: Record<string, any>, metricType: string): number {
    try {
      // Create a safe evaluation context
      const context = {
        data,
        Math,
        parseFloat: Number.parseFloat,
        parseInt: Number.parseInt,
        count: data.count || 0,
        sum: data.sum || 0,
        avg: data.avg || 0,
        min: data.min || 0,
        max: data.max || 0,
      };

      // Evaluate formula safely
      const result = this.evaluateFormula(formula, context);
      
      // Ensure result is a number
      const numericResult = Number(result);
      
      if (isNaN(numericResult)) {
        throw new Error(`Formula resulted in non-numeric value: ${result}`);
      }
      
      return numericResult;
    } catch (error) {
      this.logger.error(`Formula evaluation failed: ${formula}`, error);
      return 0;
    }
  }

  private evaluateFormula(formula: string, context: Record<string, any>): any {
    // Simple formula evaluator - in production, use a proper expression parser
    try {
      // Replace common patterns
      let evalFormula = formula
        .replace(/\bdata\./g, 'data.')
        .replace(/\bcount\b/g, 'context.count')
        .replace(/\bsum\b/g, 'context.sum')
        .replace(/\bavg\b/g, 'context.avg')
        .replace(/\bmin\b/g, 'context.min')
        .replace(/\bmax\b/g, 'context.max');

      // Create a function that evaluates the formula
      const func = new Function('context', `
        const { data, Math, parseFloat, parseInt, count, sum, avg, min, max } = context;
        return ${evalFormula};
      `);

      return func(context);
    } catch (error) {
      throw new Error(`Formula evaluation error: ${error.message}`);
    }
  }

  private evaluateStatus(value: number, thresholds: { warning?: number; critical?: number }): 'normal' | 'warning' | 'critical' {
    if (thresholds.critical !== undefined && value >= thresholds.critical) {
      return 'critical';
    }
    if (thresholds.warning !== undefined && value >= thresholds.warning) {
      return 'warning';
    }
    return 'normal';
  }

  private generateTags(definition: MetricDefinition): Record<string, string> {
    const tags: Record<string, string> = {
      type: definition.type,
      unit: definition.unit,
    };
    
    for (const tag of definition.tags) {
      tags[tag] = 'true';
    }
    
    return tags;
  }

  private async saveMetricToRedis(metric: CalculatedMetric): Promise<void> {
    const key = `metric:${metric.name}:${metric.timestamp.getTime()}`;
    
    await this.redis.hset(key, {
      name: metric.name,
      value: metric.value.toString(),
      unit: metric.unit,
      status: metric.status,
      timestamp: metric.timestamp.toISOString(),
      tags: JSON.stringify(metric.tags),
      metadata: JSON.stringify(metric.metadata),
    });
    
    // Set expiration (keep metrics for 7 days)
    await this.redis.expire(key, 7 * 24 * 60 * 60);
    
    // Add to time series index
    await this.redis.zadd(`metrics:${metric.name}`, metric.timestamp.getTime(), key);
  }

  private async getMetricsFromRedis(
    metricName: string,
    startTime?: Date,
    endTime?: Date,
    tags?: Record<string, string>,
  ): Promise<CalculatedMetric[]> {
    const timeSeriesKey = `metrics:${metricName}`;
    
    let minScore = startTime ? startTime.getTime() : '-inf';
    let maxScore = endTime ? endTime.getTime() : '+inf';
    
    const keys = await this.redis.zrangebyscore(timeSeriesKey, minScore, maxScore);
    const metrics: CalculatedMetric[] = [];
    
    for (const key of keys) {
      const data = await this.redis.hgetall(key);
      
      if (Object.keys(data).length === 0) continue;
      
      const metric: CalculatedMetric = {
        name: data.name,
        timestamp: new Date(data.timestamp),
        value: Number(data.value),
        unit: data.unit,
        status: data.status as any,
        tags: JSON.parse(data.tags || '{}'),
        threshold: JSON.parse(data.threshold || '{}'),
        metadata: JSON.parse(data.metadata || '{}'),
      };
      
      // Filter by tags if specified
      if (tags) {
        let matches = true;
        for (const [tagKey, tagValue] of Object.entries(tags)) {
          if (metric.tags[tagKey] !== tagValue) {
            matches = false;
            break;
          }
        }
        if (!matches) continue;
      }
      
      metrics.push(metric);
    }
    
    return metrics.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  private async checkAlerts(metric: CalculatedMetric): Promise<void> {
    if (metric.status === 'normal') return;
    
    const alert: MetricAlert = {
      metricName: metric.name,
      status: metric.status,
      value: metric.value,
      threshold: metric.threshold![metric.status] || 0,
      timestamp: metric.timestamp,
      message: this.generateAlertMessage(metric),
      tags: metric.tags,
    };
    
    // Save alert to Redis
    const alertKey = `alert:${metric.name}:${metric.timestamp.getTime()}`;
    await this.redis.hset(alertKey, {
      ...alert,
      timestamp: alert.timestamp.toISOString(),
      tags: JSON.stringify(alert.tags),
    });
    
    // Add to alerts list
    await this.redis.zadd('alerts', alert.timestamp.getTime(), alertKey);
    
    // Set expiration (keep alerts for 30 days)
    await this.redis.expire(alertKey, 30 * 24 * 60 * 60);
    
    this.logger.warn(`Metric alert: ${alert.message}`);
  }

  private generateAlertMessage(metric: CalculatedMetric): string {
    const threshold = metric.threshold![metric.status];
    
    switch (metric.status) {
      case 'warning':
        return `Metric ${metric.name} exceeded warning threshold: ${metric.value} ${metric.unit} (threshold: ${threshold} ${metric.unit})`;
      case 'critical':
        return `Metric ${metric.name} exceeded critical threshold: ${metric.value} ${metric.unit} (threshold: ${threshold} ${metric.unit})`;
      default:
        return `Metric ${metric.name} status: ${metric.status}`;
    }
  }

  private async getAggregatedData(
    ruleName: string,
    startTime: Date,
    endTime: Date,
  ): Promise<AggregatedData[]> {
    const keys = await this.redis.keys(`aggregated:${ruleName}:*`);
    const data: AggregatedData[] = [];
    
    for (const key of keys) {
      const timestamp = parseInt(key.split(':')[2]);
      
      if (timestamp >= startTime.getTime() && timestamp <= endTime.getTime()) {
        const value = await this.redis.hget(key, 'data');
        if (value) {
          data.push(JSON.parse(value));
        }
      }
    }
    
    return data;
  }

  private parseInterval(interval: string): number {
    const unit = interval.slice(-1);
    const value = parseInt(interval.slice(0, -1));
    
    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 5 * 60 * 1000; // Default 5 minutes
    }
  }

  private initializeDefaultMetrics(): Promise<void> {
    const defaultMetrics: MetricDefinition[] = [
      {
        name: 'user_activity_rate',
        description: 'Number of user actions per minute',
        type: 'rate',
        unit: 'actions/min',
        tags: ['user', 'activity'],
        calculation: {
          source: 'aggregated:user_activity_by_minute',
          formula: 'count',
          window: 5,
        },
        thresholds: {
          warning: 100,
          critical: 200,
        },
        enabled: true,
      },
      {
        name: 'error_rate',
        description: 'Percentage of errors in total requests',
        type: 'ratio',
        unit: '%',
        tags: ['error', 'quality'],
        calculation: {
          source: 'aggregated:error_rate_by_minute',
          formula: '(count / total_requests) * 100',
          window: 5,
        },
        thresholds: {
          warning: 5,
          critical: 10,
        },
        enabled: true,
      },
      {
        name: 'api_response_time',
        description: 'Average API response time',
        type: 'gauge',
        unit: 'ms',
        tags: ['performance', 'api'],
        calculation: {
          source: 'aggregated:api_performance_by_minute',
          formula: 'avg',
          window: 5,
        },
        thresholds: {
          warning: 1000,
          critical: 2000,
        },
        enabled: true,
      },
      {
        name: 'course_completion_rate',
        description: 'Average course completion rate',
        type: 'gauge',
        unit: '%',
        tags: ['course', 'engagement'],
        calculation: {
          source: 'aggregated:course_engagement_by_hour',
          formula: 'avg',
          window: 60,
        },
        thresholds: {
          warning: 60,
          critical: 40,
        },
        enabled: true,
      },
      {
        name: 'payment_success_rate',
        description: 'Percentage of successful payments',
        type: 'ratio',
        unit: '%',
        tags: ['payment', 'revenue'],
        calculation: {
          source: 'aggregated:payment_transactions_by_hour',
          formula: '(sum_success / sum_total) * 100',
          window: 60,
        },
        thresholds: {
          warning: 95,
          critical: 90,
        },
        enabled: true,
      },
    ];

    for (const metric of defaultMetrics) {
      this.metricDefinitions.set(metric.name, metric);
    }

    this.logger.log(`Initialized ${defaultMetrics.length} default metric definitions`);
    return Promise.resolve();
  }

  async getMetricDefinitions(): Promise<MetricDefinition[]> {
    return Array.from(this.metricDefinitions.values());
  }

  async getAlerts(
    startTime?: Date,
    endTime?: Date,
    status?: 'warning' | 'critical',
  ): Promise<MetricAlert[]> {
    const keys = await this.redis.zrange('alerts', 0, -1);
    const alerts: MetricAlert[] = [];
    
    for (const key of keys) {
      const data = await this.redis.hgetall(key);
      
      if (Object.keys(data).length === 0) continue;
      
      const alert: MetricAlert = {
        metricName: data.metricName,
        status: data.status as any,
        value: Number(data.value),
        threshold: Number(data.threshold),
        timestamp: new Date(data.timestamp),
        message: data.message,
        tags: JSON.parse(data.tags || '{}'),
      };
      
      // Filter by time range
      if (startTime && alert.timestamp < startTime) continue;
      if (endTime && alert.timestamp > endTime) continue;
      
      // Filter by status
      if (status && alert.status !== status) continue;
      
      alerts.push(alert);
    }
    
    return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
}
