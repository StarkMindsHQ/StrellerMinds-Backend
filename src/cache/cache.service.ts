import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { CacheMetricsService } from './cache.metrics';
import { CACHE_TTL, CACHE_KEYS } from './cache.constants';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly metrics: CacheMetricsService,
  ) {}

  async getOrSet<T>(
    key: string, 
    handler: () => Promise<T>, 
    ttl = CACHE_TTL.DEFAULT,
    options?: {
      trackMetrics?: boolean;
      tags?: string[];
    }
  ): Promise<T> {
    const startTime = Date.now();
    const trackMetrics = options?.trackMetrics ?? true;

    try {
      const cached = await this.redis.get<T>(key);

      if (cached) {
        if (trackMetrics) {
          const responseTime = Date.now() - startTime;
          await this.metrics.recordHit(key, responseTime);
        }
        return cached;
      }

      if (trackMetrics) {
        await this.metrics.recordMiss(key);
      }

      const result = await handler();
      await this.set(key, result, ttl, { trackMetrics, tags: options?.tags });

      return result;
    } catch (error) {
      this.logger.error(`Cache operation failed for key ${key}:`, error);
      // Fallback to handler if cache fails
      return handler();
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      return await this.redis.get<T>(key);
    } catch (error) {
      this.logger.error(`Cache get failed for key ${key}:`, error);
      return null;
    }
  }

  async set(
    key: string,
    value: any,
    ttl = CACHE_TTL.DEFAULT,
    options?: {
      trackMetrics?: boolean;
      tags?: string[];
    }
  ): Promise<void> {
    try {
      await this.redis.set(key, value, ttl);
      
      if (options?.trackMetrics !== false) {
        await this.metrics.recordSet(key);
      }

      // Store tags for cache invalidation
      if (options?.tags?.length) {
        await this.addTags(key, options.tags);
      }
    } catch (error) {
      this.logger.error(`Cache set failed for key ${key}:`, error);
    }
  }

  async invalidate(key: string): Promise<void> {
    try {
      await this.redis.del(key);
      await this.metrics.recordInvalidation(key);
    } catch (error) {
      this.logger.error(`Cache invalidation failed for key ${key}:`, error);
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      await this.redis.invalidatePattern(pattern);
    } catch (error) {
      this.logger.error(`Cache pattern invalidation failed for pattern ${pattern}:`, error);
    }
  }

  async invalidateByTag(tag: string): Promise<void> {
    try {
      const tagKey = `cache:tags:${tag}`;
      const keys = await this.redis.get<string[]>(tagKey);
      
      if (keys?.length) {
        await this.redis.del(...keys);
        await this.redis.del(tagKey);
      }
    } catch (error) {
      this.logger.error(`Cache tag invalidation failed for tag ${tag}:`, error);
    }
  }

  async warmCache(entries: Array<{
    key: string;
    handler: () => Promise<any>;
    ttl?: number;
    tags?: string[];
  }>): Promise<void> {
    const promises = entries.map(async (entry) => {
      try {
        const result = await entry.handler();
        await this.set(entry.key, result, entry.ttl, { 
          trackMetrics: false, 
          tags: entry.tags 
        });
      } catch (error) {
        this.logger.error(`Cache warming failed for key ${entry.key}:`, error);
      }
    });

    await Promise.allSettled(promises);
  }

  getStats() {
    return this.metrics.getMetrics();
  }

  async resetStats(): Promise<void> {
    await this.metrics.resetMetrics();
  }

  private async addTags(key: string, tags: string[]): Promise<void> {
    for (const tag of tags) {
      const tagKey = `cache:tags:${tag}`;
      const taggedKeys = (await this.redis.get<string[]>(tagKey)) || [];
      
      if (!taggedKeys.includes(key)) {
        taggedKeys.push(key);
        await this.redis.set(tagKey, taggedKeys, CACHE_TTL.EXTENDED);
      }
    }
  }

  // Convenience methods for common cache patterns
  async cacheCourse(courseId: string, handler: () => Promise<any>) {
    return this.getOrSet(
      CACHE_KEYS.COURSE(courseId),
      handler,
      CACHE_TTL.MEDIUM,
      { tags: ['course', `course:${courseId}`] }
    );
  }

  async cacheCourseList(filters: string, handler: () => Promise<any>) {
    return this.getOrSet(
      CACHE_KEYS.COURSE_LIST(filters),
      handler,
      CACHE_TTL.SHORT,
      { tags: ['courses', 'list'] }
    );
  }

  async cacheUserProfile(userId: string, handler: () => Promise<any>) {
    return this.getOrSet(
      CACHE_KEYS.USER_PROFILE(userId),
      handler,
      CACHE_TTL.LONG,
      { tags: ['user', `user:${userId}`] }
    );
  }

  async cacheAnalytics(type: string, id: string, handler: () => Promise<any>) {
    return this.getOrSet(
      CACHE_KEYS.ANALYTICS(type, id),
      handler,
      CACHE_TTL.MEDIUM,
      { tags: ['analytics', type, `${type}:${id}`] }
    );
  }

  async cacheDashboard(userId: string, handler: () => Promise<any>) {
    return this.getOrSet(
      CACHE_KEYS.DASHBOARD(userId),
      handler,
      CACHE_TTL.SHORT,
      { tags: ['dashboard', `user:${userId}`] }
    );
  }
}
