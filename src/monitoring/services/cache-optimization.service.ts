import { Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { CacheMetrics } from '../interfaces/apm.interface';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface CacheLayer {
  name: string;
  type: 'memory' | 'redis' | 'database';
  hitRate: number;
  size: number;
  operations: {
    get: number;
    set: number;
    delete: number;
  };
}

@Injectable()
export class CacheOptimizationService {
  private readonly logger = new Logger(CacheOptimizationService.name);
  private readonly cacheStats = new Map<string, CacheMetrics>();
  private redisClient: Redis;

  // L1: In-memory cache (Node.js Map)
  private l1Cache = new Map<string, { value: any; expiry: number }>();

  // Cache statistics
  private stats = {
    l1: { hits: 0, misses: 0, sets: 0, deletes: 0 },
    l2: { hits: 0, misses: 0, sets: 0, deletes: 0 },
    l3: { hits: 0, misses: 0, sets: 0, deletes: 0 },
  };

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {
    // Initialize Redis client for L2 cache
    this.initializeRedis();
    // Start periodic cache cleanup
    this.startCacheCleanup();
  }

  /**
   * Initialize Redis client
   */
  private initializeRedis(): void {
    try {
      this.redisClient = new Redis({
        host: this.configService.get('REDIS_HOST', 'localhost'),
        port: this.configService.get('REDIS_PORT', 6379),
        password: this.configService.get('REDIS_PASSWORD'),
        retryStrategy: (times) => {
          return Math.min(times * 50, 2000);
        },
      });

      this.redisClient.on('error', (error) => {
        this.logger.error(`Redis connection error: ${error.message}`);
      });
    } catch (error) {
      this.logger.warn(`Redis not available, using memory cache only: ${error.message}`);
    }
  }

  /**
   * Multi-level cache get
   */
  async get<T>(key: string): Promise<T | undefined> {
    // L1: Check in-memory cache
    const l1Entry = this.l1Cache.get(key);
    if (l1Entry && l1Entry.expiry > Date.now()) {
      this.stats.l1.hits++;
      return l1Entry.value as T;
    }
    if (l1Entry) {
      this.l1Cache.delete(key); // Expired
    }
    this.stats.l1.misses++;

    // L2: Check Redis cache
    if (this.redisClient) {
      try {
        const value = await this.redisClient.get(key);
        if (value) {
          const parsed = JSON.parse(value);
          // Promote to L1
          this.setL1(key, parsed.value, parsed.ttl);
          this.stats.l2.hits++;
          return parsed.value as T;
        }
        this.stats.l2.misses++;
      } catch (error) {
        this.logger.warn(`Redis get error: ${error.message}`);
      }
    }

    // L3: Check NestJS cache manager (database-backed)
    try {
      const value = await this.cacheManager.get<T>(key);
      if (value) {
        // Promote to L2 and L1
        await this.setL2(key, value);
        this.setL1(key, value);
        this.stats.l3.hits++;
        return value;
      }
      this.stats.l3.misses++;
    } catch (error) {
      this.logger.warn(`Cache manager get error: ${error.message}`);
    }

    return undefined;
  }

  /**
   * Multi-level cache set
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    const ttlMs = ttl ? ttl * 1000 : 3600000; // Default 1 hour

    // Set in all layers
    this.setL1(key, value, ttlMs);
    await this.setL2(key, value, ttl);
    await this.setL3(key, value, ttl);

    this.stats.l1.sets++;
    this.stats.l2.sets++;
    this.stats.l3.sets++;
  }

  /**
   * Set in L1 (in-memory)
   */
  private setL1(key: string, value: any, ttl: number): void {
    this.l1Cache.set(key, {
      value,
      expiry: Date.now() + ttl,
    });
  }

  /**
   * Set in L2 (Redis)
   */
  private async setL2(key: string, value: any, ttl?: number): Promise<void> {
    if (!this.redisClient) return;

    try {
      const data = JSON.stringify({ value, ttl: ttl || 3600 });
      if (ttl) {
        await this.redisClient.setex(key, ttl, data);
      } else {
        await this.redisClient.set(key, data);
      }
    } catch (error) {
      this.logger.warn(`Redis set error: ${error.message}`);
    }
  }

  /**
   * Set in L3 (NestJS cache manager)
   */
  private async setL3(key: string, value: any, ttl?: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl || 3600);
    } catch (error) {
      this.logger.warn(`Cache manager set error: ${error.message}`);
    }
  }

  /**
   * Delete from all cache layers
   */
  async delete(key: string): Promise<void> {
    this.l1Cache.delete(key);
    this.stats.l1.deletes++;

    if (this.redisClient) {
      try {
        await this.redisClient.del(key);
        this.stats.l2.deletes++;
      } catch (error) {
        this.logger.warn(`Redis delete error: ${error.message}`);
      }
    }

    try {
      await this.cacheManager.del(key);
      this.stats.l3.deletes++;
    } catch (error) {
      this.logger.warn(`Cache manager delete error: ${error.message}`);
    }
  }

  /**
   * Get cache metrics for all layers
   */
  getCacheMetrics(): {
    l1: CacheMetrics;
    l2: CacheMetrics;
    l3: CacheMetrics;
    overall: CacheMetrics;
  } {
    const l1Metrics = this.calculateMetrics(this.stats.l1);
    const l2Metrics = this.calculateMetrics(this.stats.l2);
    const l3Metrics = this.calculateMetrics(this.stats.l3);

    const overall = {
      hits: this.stats.l1.hits + this.stats.l2.hits + this.stats.l3.hits,
      misses: this.stats.l1.misses + this.stats.l2.misses + this.stats.l3.misses,
      hitRate: 0,
      size: this.l1Cache.size,
      evictions: 0,
      operations: {
        get: l1Metrics.operations.get + l2Metrics.operations.get + l3Metrics.operations.get,
        set: l1Metrics.operations.set + l2Metrics.operations.set + l3Metrics.operations.set,
        delete: l1Metrics.operations.delete + l2Metrics.operations.delete + l3Metrics.operations.delete,
      },
    };

    const totalOps = overall.hits + overall.misses;
    overall.hitRate = totalOps > 0 ? (overall.hits / totalOps) * 100 : 0;

    return {
      l1: { ...l1Metrics, size: this.l1Cache.size },
      l2: { ...l2Metrics, size: 0 }, // Redis size would need additional call
      l3: { ...l3Metrics, size: 0 },
      overall,
    };
  }

  /**
   * Calculate metrics from stats
   */
  private calculateMetrics(stats: typeof this.stats.l1): CacheMetrics {
    const totalOps = stats.hits + stats.misses;
    const hitRate = totalOps > 0 ? (stats.hits / totalOps) * 100 : 0;

    return {
      hits: stats.hits,
      misses: stats.misses,
      hitRate,
      size: 0,
      evictions: 0,
      operations: {
        get: stats.hits + stats.misses,
        set: stats.sets,
        delete: stats.deletes,
      },
    };
  }

  /**
   * Get cache layers information
   */
  getCacheLayers(): CacheLayer[] {
    const metrics = this.getCacheMetrics();

    return [
      {
        name: 'L1 - In-Memory',
        type: 'memory',
        hitRate: metrics.l1.hitRate,
        size: metrics.l1.size,
        operations: metrics.l1.operations,
      },
      {
        name: 'L2 - Redis',
        type: 'redis',
        hitRate: metrics.l2.hitRate,
        size: metrics.l2.size,
        operations: metrics.l2.operations,
      },
      {
        name: 'L3 - Database',
        type: 'database',
        hitRate: metrics.l3.hitRate,
        size: metrics.l3.size,
        operations: metrics.l3.operations,
      },
    ];
  }

  /**
   * Clear all cache layers
   */
  async clearAll(): Promise<void> {
    this.l1Cache.clear();
    this.stats.l1 = { hits: 0, misses: 0, sets: 0, deletes: 0 };

    if (this.redisClient) {
      try {
        await this.redisClient.flushdb();
        this.stats.l2 = { hits: 0, misses: 0, sets: 0, deletes: 0 };
      } catch (error) {
        this.logger.error(`Failed to clear Redis: ${error.message}`);
      }
    }

    // Note: Cache manager doesn't have a clear all method
    this.stats.l3 = { hits: 0, misses: 0, sets: 0, deletes: 0 };
  }

  /**
   * Start periodic cache cleanup
   */
  private startCacheCleanup(): void {
    setInterval(() => {
      this.cleanupL1Cache();
    }, 60000); // Every minute
  }

  /**
   * Cleanup expired entries from L1 cache
   */
  private cleanupL1Cache(): void {
    const now = Date.now();
    let evicted = 0;

    for (const [key, entry] of this.l1Cache.entries()) {
      if (entry.expiry <= now) {
        this.l1Cache.delete(key);
        evicted++;
      }
    }

    if (evicted > 0) {
      this.logger.debug(`Cleaned up ${evicted} expired cache entries`);
    }

    // Limit L1 cache size
    const maxSize = 10000;
    if (this.l1Cache.size > maxSize) {
      const entries = Array.from(this.l1Cache.entries());
      entries.sort((a, b) => a[1].expiry - b[1].expiry); // Sort by expiry
      const toRemove = entries.slice(0, this.l1Cache.size - maxSize);
      toRemove.forEach(([key]) => this.l1Cache.delete(key));
    }
  }
}
