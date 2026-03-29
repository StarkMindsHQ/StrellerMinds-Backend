import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface CacheAccessRecord {
  key: string;
  timestamp: number;
  hit: boolean;
  duration: number;
  tags?: string[];
}

export interface CacheMetrics {
  totalRequests: number;
  hits: number;
  misses: number;
  hitRate: number;
  averageResponseTime: number;
  slowQueries: Array<{ key: string; duration: number; timestamp: number }>;
  hotKeys: Array<{ key: string; accessCount: number; lastAccessed: number }>;
  coldKeys: Array<{ key: string; lastAccessed: number }>;
  tagPerformance: Array<{ tag: string; hitRate: number; accessCount: number }>;
}

export interface OptimizationRecommendation {
  type: 'ttl_adjustment' | 'cache_warming' | 'pattern_optimization' | 'memory_increase' | 'cleanup';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: string;
  action: string;
  key?: string;
  tag?: string;
  currentValue?: any;
  recommendedValue?: any;
}

export interface PerformanceReport {
  timestamp: number;
  metrics: CacheMetrics;
  recommendations: OptimizationRecommendation[];
  score: number; // 0-100 performance score
}

@Injectable()
export class CacheOptimizationService {
  private readonly logger = new Logger(CacheOptimizationService.name);
  private readonly accessRecords: CacheAccessRecord[] = [];
  private readonly maxRecords = 10000;
  private readonly reportHistory: PerformanceReport[] = [];
  private readonly maxReports = 100;

  constructor(private readonly configService: ConfigService) {
    // Start periodic analysis
    this.startPeriodicAnalysis();
  }

  async recordCacheAccess(
    key: string,
    hit: boolean,
    duration: number,
    tags?: string[],
  ): Promise<void> {
    const record: CacheAccessRecord = {
      key,
      timestamp: Date.now(),
      hit,
      duration,
      tags,
    };

    this.accessRecords.push(record);

    // Keep only recent records
    if (this.accessRecords.length > this.maxRecords) {
      this.accessRecords.splice(0, this.accessRecords.length - this.maxRecords);
    }

    // Alert on slow queries
    if (duration > 1000) { // 1 second threshold
      this.logger.warn(`Slow cache access: ${key} took ${duration}ms`);
    }
  }

  async getMetrics(timeWindow?: number): Promise<CacheMetrics> {
    const now = Date.now();
    const windowStart = timeWindow ? now - timeWindow : 0;
    const recentRecords = this.accessRecords.filter(r => r.timestamp >= windowStart);

    if (recentRecords.length === 0) {
      return {
        totalRequests: 0,
        hits: 0,
        misses: 0,
        hitRate: 0,
        averageResponseTime: 0,
        slowQueries: [],
        hotKeys: [],
        coldKeys: [],
        tagPerformance: [],
      };
    }

    const hits = recentRecords.filter(r => r.hit).length;
    const misses = recentRecords.filter(r => !r.hit).length;
    const totalDuration = recentRecords.reduce((sum, r) => sum + r.duration, 0);
    const averageResponseTime = totalDuration / recentRecords.length;

    // Identify slow queries (>500ms)
    const slowQueries = recentRecords
      .filter(r => r.duration > 500)
      .map(r => ({ key: r.key, duration: r.duration, timestamp: r.timestamp }))
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    // Identify hot keys (most accessed)
    const keyAccessMap = new Map<string, { count: number; lastAccessed: number }>();
    recentRecords.forEach(r => {
      const existing = keyAccessMap.get(r.key) || { count: 0, lastAccessed: 0 };
      keyAccessMap.set(r.key, {
        count: existing.count + 1,
        lastAccessed: Math.max(existing.lastAccessed, r.timestamp),
      });
    });

    const hotKeys = Array.from(keyAccessMap.entries())
      .map(([key, data]) => ({ key, accessCount: data.count, lastAccessed: data.lastAccessed }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 20);

    // Identify cold keys (not accessed recently)
    const oneHourAgo = now - 3600000; // 1 hour ago
    const coldKeys = Array.from(keyAccessMap.entries())
      .filter(([_, data]) => data.lastAccessed < oneHourAgo)
      .map(([key, data]) => ({ key, lastAccessed: data.lastAccessed }))
      .sort((a, b) => a.lastAccessed - b.lastAccessed)
      .slice(0, 20);

    // Analyze tag performance
    const tagStats = new Map<string, { hits: number; total: number }>();
    recentRecords.forEach(r => {
      if (r.tags) {
        r.tags.forEach(tag => {
          const stats = tagStats.get(tag) || { hits: 0, total: 0 };
          stats.total++;
          if (r.hit) stats.hits++;
          tagStats.set(tag, stats);
        });
      }
    });

    const tagPerformance = Array.from(tagStats.entries())
      .map(([tag, stats]) => ({
        tag,
        hitRate: stats.total > 0 ? (stats.hits / stats.total) * 100 : 0,
        accessCount: stats.total,
      }))
      .sort((a, b) => b.accessCount - a.accessCount);

    return {
      totalRequests: recentRecords.length,
      hits,
      misses,
      hitRate: (hits / recentRecords.length) * 100,
      averageResponseTime,
      slowQueries,
      hotKeys,
      coldKeys,
      tagPerformance,
    };
  }

  async getRecommendations(): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];
    const metrics = await this.getMetrics(3600000); // Last hour

    // Low hit rate recommendation
    if (metrics.hitRate < 70) {
      recommendations.push({
        type: 'cache_warming',
        priority: metrics.hitRate < 50 ? 'critical' : 'high',
        description: `Cache hit rate is ${metrics.hitRate.toFixed(1)}%, which is below optimal levels`,
        impact: 'Improving hit rate will reduce database load and response times',
        action: 'Implement cache warming for frequently accessed data',
        recommendedValue: 'Target hit rate > 85%',
      });
    }

    // Slow queries recommendation
    if (metrics.slowQueries.length > 5) {
      recommendations.push({
        type: 'pattern_optimization',
        priority: 'high',
        description: `${metrics.slowQueries.length} slow cache queries detected in the last hour`,
        impact: 'Slow queries indicate potential bottlenecks in cache operations',
        action: 'Review and optimize cache key patterns and data structures',
        recommendedValue: 'Cache operations should complete within 500ms',
      });
    }

    // Hot keys recommendation
    if (metrics.hotKeys.length > 0) {
      const topHotKey = metrics.hotKeys[0];
      if (topHotKey.accessCount > 100) {
        recommendations.push({
          type: 'ttl_adjustment',
          priority: 'medium',
          description: `Key "${topHotKey.key}" is accessed ${topHotKey.accessCount} times`,
          impact: 'High-access keys should have longer TTL to reduce cache misses',
          action: 'Increase TTL for frequently accessed keys',
          key: topHotKey.key,
          recommendedValue: 'TTL: 3600s (1 hour)',
        });
      }
    }

    // Cold keys recommendation
    if (metrics.coldKeys.length > 50) {
      recommendations.push({
        type: 'cleanup',
        priority: 'low',
        description: `${metrics.coldKeys.length} keys haven't been accessed in over an hour`,
        impact: 'Cold keys consume memory without providing value',
        action: 'Implement cleanup strategy for unused cache keys',
        recommendedValue: 'Remove keys not accessed for 2+ hours',
      });
    }

    // Memory usage recommendation
    if (metrics.averageResponseTime > 100) {
      recommendations.push({
        type: 'memory_increase',
        priority: 'medium',
        description: `Average cache response time is ${metrics.averageResponseTime.toFixed(1)}ms`,
        impact: 'High response times may indicate memory pressure',
        action: 'Consider increasing cache memory or optimizing data structures',
        recommendedValue: 'Target response time < 100ms',
      });
    }

    // Tag-specific recommendations
    const lowPerformingTags = metrics.tagPerformance.filter(t => t.hitRate < 60 && t.accessCount > 10);
    lowPerformingTags.forEach(tag => {
      recommendations.push({
        type: 'cache_warming',
        priority: 'medium',
        description: `Tag "${tag.tag}" has low hit rate of ${tag.hitRate.toFixed(1)}%`,
        impact: 'Poor performing tags may need different caching strategies',
        action: 'Review caching strategy for this tag',
        tag: tag.tag,
        recommendedValue: 'Implement targeted warming for this tag',
      });
    });

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  async generatePerformanceReport(): Promise<PerformanceReport> {
    const metrics = await this.getMetrics();
    const recommendations = await this.getRecommendations();
    const score = this.calculatePerformanceScore(metrics);

    const report: PerformanceReport = {
      timestamp: Date.now(),
      metrics,
      recommendations,
      score,
    };

    // Store in history
    this.reportHistory.push(report);
    if (this.reportHistory.length > this.maxReports) {
      this.reportHistory.shift();
    }

    this.logger.log(`Generated performance report with score: ${score}/100`);
    return report;
  }

  private calculatePerformanceScore(metrics: CacheMetrics): number {
    let score = 0;

    // Hit rate (40 points)
    if (metrics.hitRate >= 90) score += 40;
    else if (metrics.hitRate >= 80) score += 35;
    else if (metrics.hitRate >= 70) score += 25;
    else if (metrics.hitRate >= 60) score += 15;
    else if (metrics.hitRate >= 50) score += 5;

    // Response time (30 points)
    if (metrics.averageResponseTime <= 50) score += 30;
    else if (metrics.averageResponseTime <= 100) score += 25;
    else if (metrics.averageResponseTime <= 200) score += 15;
    else if (metrics.averageResponseTime <= 500) score += 5;

    // Slow queries (20 points)
    if (metrics.slowQueries.length === 0) score += 20;
    else if (metrics.slowQueries.length <= 2) score += 15;
    else if (metrics.slowQueries.length <= 5) score += 10;
    else if (metrics.slowQueries.length <= 10) score += 5;

    // Cold keys (10 points)
    if (metrics.coldKeys.length <= 10) score += 10;
    else if (metrics.coldKeys.length <= 25) score += 7;
    else if (metrics.coldKeys.length <= 50) score += 4;
    else if (metrics.coldKeys.length <= 100) score += 1;

    return Math.min(100, Math.max(0, score));
  }

  getReportHistory(): PerformanceReport[] {
    return [...this.reportHistory];
  }

  async getTrendData(hours: number = 24): Promise<any> {
    const now = Date.now();
    const windowStart = now - (hours * 3600000);
    const records = this.accessRecords.filter(r => r.timestamp >= windowStart);

    // Group by hour
    const hourlyData = new Map<number, {
      hits: number;
      misses: number;
      avgResponseTime: number;
      requests: number;
    }>();

    records.forEach(record => {
      const hour = Math.floor(record.timestamp / 3600000) * 3600000;
      const data = hourlyData.get(hour) || {
        hits: 0,
        misses: 0,
        avgResponseTime: 0,
        requests: 0,
      };

      data.requests++;
      if (record.hit) data.hits++;
      else data.misses++;

      hourlyData.set(hour, data);
    });

    // Calculate averages and format
    return Array.from(hourlyData.entries())
      .map(([timestamp, data]) => ({
        timestamp,
        hitRate: data.requests > 0 ? (data.hits / data.requests) * 100 : 0,
        requestCount: data.requests,
        avgResponseTime: data.avgResponseTime,
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  private startPeriodicAnalysis(): void {
    // Run analysis every 5 minutes
    setInterval(async () => {
      try {
        await this.generatePerformanceReport();
      } catch (error) {
        this.logger.error('Failed to generate periodic performance report:', error);
      }
    }, 300000); // 5 minutes
  }

  async clearHistory(): Promise<void> {
    this.accessRecords.length = 0;
    this.reportHistory.length = 0;
    this.logger.log('Cache optimization history cleared');
  }

  async exportMetrics(): Promise<any> {
    const metrics = await this.getMetrics();
    const recommendations = await this.getRecommendations();
    const trends = await this.getTrendData();

    return {
      timestamp: Date.now(),
      metrics,
      recommendations,
      trends,
      configuration: {
        maxRecords: this.maxRecords,
        maxReports: this.maxReports,
      },
    };
  }
}
