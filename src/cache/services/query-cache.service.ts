import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class QueryCacheService {
  private readonly logger = new Logger(QueryCacheService.name);
  private readonly defaultTTL: number;

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {
    this.defaultTTL = this.configService.get<number>('QUERY_CACHE_TTL', 300); // 5 minutes default
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.cacheManager.get<T>(key);
      if (cached) {
        this.logger.debug(`Cache hit for key: ${key}`);
        return cached;
      }
      this.logger.debug(`Cache miss for key: ${key}`);
      return null;
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const cacheTTL = ttl || this.defaultTTL;
      await this.cacheManager.set(key, value, cacheTTL);
      this.logger.debug(`Cache set for key: ${key}, TTL: ${cacheTTL}s`);
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  async invalidate(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.debug(`Cache invalidated for key: ${key}`);
    } catch (error) {
      this.logger.error(`Cache invalidate error for key ${key}:`, error);
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      // This would require cache manager that supports pattern matching
      // For now, we'll log and implement a basic approach
      this.logger.debug(`Cache invalidation for pattern: ${pattern}`);
      // Implementation would depend on the cache provider (Redis, etc.)
    } catch (error) {
      this.logger.error(`Cache invalidate pattern error for ${pattern}:`, error);
    }
  }

  generateCacheKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    return `${prefix}:${sortedParams}`;
  }

  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const result = await fetchFn();
    await this.set(key, result, ttl);
    return result;
  }

  // Cache invalidation strategies
  async invalidateUserCache(userId: string): Promise<void> {
    await this.invalidatePattern(`user:${userId}:*`);
    await this.invalidatePattern(`users:*`); // Invalidate user lists
  }

  async invalidateCourseCache(courseId: string): Promise<void> {
    await this.invalidatePattern(`course:${courseId}:*`);
    await this.invalidatePattern(`courses:*`); // Invalidate course lists
  }

  async invalidateAnalyticsCache(): Promise<void> {
    await this.invalidatePattern(`analytics:*`);
    await this.invalidatePattern(`reports:*`);
  }

  // Cache warming strategies
  async warmUserCache(userId: string): Promise<void> {
    // This would be implemented based on common user queries
    this.logger.debug(`Warming cache for user: ${userId}`);
  }

  async warmCourseCache(courseId: string): Promise<void> {
    // This would be implemented based on common course queries
    this.logger.debug(`Warming cache for course: ${courseId}`);
  }

  // Cache statistics
  async getCacheStats(): Promise<any> {
    try {
      // This would depend on the cache provider
      return {
        hits: 0,
        misses: 0,
        hitRate: 0,
        size: 0,
      };
    } catch (error) {
      this.logger.error('Failed to get cache stats:', error);
      return null;
    }
  }
}
