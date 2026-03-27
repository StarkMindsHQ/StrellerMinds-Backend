import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
  avgResponseTime: number;
  memoryUsage: number;
  keyCount: number;
}

export interface CacheStats {
  global: CacheMetrics;
  byKey: Record<string, Partial<CacheMetrics>>;
  timestamp: string;
}

@Injectable()
export class CacheMetricsService {
  private readonly METRICS_KEY = 'cache:metrics';
  private readonly STATS_KEY = 'cache:stats';

  constructor(private readonly redis: RedisService) {}

  async recordHit(key: string, responseTime?: number): Promise<void> {
    await this.updateMetric(key, 'hits', 1, responseTime);
  }

  async recordMiss(key: string, responseTime?: number): Promise<void> {
    await this.updateMetric(key, 'misses', 1, responseTime);
  }

  async recordSet(key: string): Promise<void> {
    await this.updateMetric(key, 'sets', 1);
  }

  async recordInvalidation(key: string): Promise<void> {
    await this.updateMetric(key, 'invalidations', 1);
  }

  async getMetrics(): Promise<CacheStats> {
    const metrics = await this.redis.get<Record<string, any>>(this.METRICS_KEY);
    const stats = await this.redis.get<Record<string, any>>(this.STATS_KEY);

    const global: CacheMetrics = {
      hits: metrics?.hits || 0,
      misses: metrics?.misses || 0,
      hitRate: this.calculateHitRate(metrics?.hits || 0, metrics?.misses || 0),
      totalRequests: (metrics?.hits || 0) + (metrics?.misses || 0),
      avgResponseTime: metrics?.avgResponseTime || 0,
      memoryUsage: stats?.memoryUsage || 0,
      keyCount: stats?.keyCount || 0,
    };

    return {
      global,
      byKey: metrics?.byKey || {},
      timestamp: new Date().toISOString(),
    };
  }

  async resetMetrics(): Promise<void> {
    await this.redis.del(this.METRICS_KEY);
  }

  async getTopKeys(limit = 10): Promise<Array<{ key: string; hits: number; misses: number }>> {
    const metrics = await this.getMetrics();
    return Object.entries(metrics.byKey)
      .map(([key, stats]) => ({
        key,
        hits: stats.hits || 0,
        misses: stats.misses || 0,
      }))
      .sort((a, b) => b.hits - a.hits)
      .slice(0, limit);
  }

  private async updateMetric(
    key: string,
    type: 'hits' | 'misses' | 'sets' | 'invalidations',
    value: number,
    responseTime?: number,
  ): Promise<void> {
    const metrics = (await this.redis.get<Record<string, any>>(this.METRICS_KEY)) || {};
    
    // Update global metrics
    metrics[type] = (metrics[type] || 0) + value;
    
    // Update per-key metrics
    if (!metrics.byKey) metrics.byKey = {};
    if (!metrics.byKey[key]) metrics.byKey[key] = {};
    
    metrics.byKey[key][type] = (metrics.byKey[key][type] || 0) + value;
    
    // Update response time if provided
    if (responseTime) {
      const currentAvg = metrics.byKey[key].avgResponseTime || 0;
      const count = metrics.byKey[key].hits + metrics.byKey[key].misses || 1;
      metrics.byKey[key].avgResponseTime = (currentAvg * (count - 1) + responseTime) / count;
      
      // Update global average
      const globalAvg = metrics.avgResponseTime || 0;
      const globalCount = metrics.hits + metrics.misses || 1;
      metrics.avgResponseTime = (globalAvg * (globalCount - 1) + responseTime) / globalCount;
    }
    
    await this.redis.set(this.METRICS_KEY, metrics, 3600); // 1 hour TTL
  }

  private calculateHitRate(hits: number, misses: number): number {
    const total = hits + misses;
    return total === 0 ? 0 : Math.round((hits / total) * 100 * 100) / 100;
  }

  async updateSystemStats(): Promise<void> {
    try {
      const info = await this.redis.getRedisInfo();
      const stats = {
        memoryUsage: info?.used_memory || 0,
        keyCount: info?.db0?.keys || 0,
        timestamp: new Date().toISOString(),
      };
      
      await this.redis.set(this.STATS_KEY, stats, 300); // 5 minutes TTL
    } catch (error) {
      console.error('Failed to update system stats:', error);
    }
  }
}