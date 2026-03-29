import { Injectable, Logger } from '@nestjs/common';
import { RedisClusterService } from './RedisCluster';
import { CacheWarmer } from './CacheWarmer';
import { CacheOptimizationService } from '../services/CacheOptimizationService';

export interface CacheOptions {
  ttl?: number;
  tags?: string[];
  priority?: 'low' | 'medium' | 'high';
  strategy?: 'write-through' | 'write-behind' | 'cache-aside';
}

export interface CacheStats {
  hits: number;
  misses: number;
  memoryHits: number;
  redisHits: number;
  hitRate: number;
  memorySize: number;
  redisSize: number;
  evictions: number;
  invalidations: number;
}

@Injectable()
export class CacheManager {
  private readonly logger = new Logger(CacheManager.name);
  private readonly memoryCache = new Map<string, { value: any; expiry: number; tags: string[]; priority: string }>();
  private readonly stats: CacheStats = {
    hits: 0,
    misses: 0,
    memoryHits: 0,
    redisHits: 0,
    hitRate: 0,
    memorySize: 0,
    redisSize: 0,
    evictions: 0,
    invalidations: 0,
  };
  private readonly maxMemorySize = 1000; // Max items in memory cache
  private readonly cleanupInterval = 60000; // 1 minute

  constructor(
    private readonly redisCluster: RedisClusterService,
    private readonly cacheWarmer: CacheWarmer,
    private readonly optimizationService: CacheOptimizationService,
  ) {
    this.startCleanupTimer();
  }

  async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now();

    // Check memory cache first (L1)
    const memoryItem = this.memoryCache.get(key);
    if (memoryItem && memoryItem.expiry > Date.now()) {
      this.stats.hits++;
      this.stats.memoryHits++;
      this.logger.debug(`Memory cache hit for key: ${key}`);
      return memoryItem.value;
    }

    // Check Redis cache (L2)
    const redisValue = await this.redisCluster.get<T>(key);
    if (redisValue !== null) {
      this.stats.hits++;
      this.stats.redisHits++;
      
      // Promote to memory cache if space available
      if (this.memoryCache.size < this.maxMemorySize) {
        const metadata = await this.redisCluster.getMetadata(key);
        this.memoryCache.set(key, {
          value: redisValue,
          expiry: Date.now() + (metadata?.ttl || 300) * 1000,
          tags: metadata?.tags || [],
          priority: metadata?.priority || 'medium',
        });
      }
      
      this.logger.debug(`Redis cache hit for key: ${key}`);
      return redisValue;
    }

    this.stats.misses++;
    this.logger.debug(`Cache miss for key: ${key}`);
    
    // Record performance metrics
    const duration = Date.now() - startTime;
    await this.optimizationService.recordCacheAccess(key, false, duration);
    
    return null;
  }

  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    const { ttl = 300, tags = [], priority = 'medium', strategy = 'cache-aside' } = options;
    const expiry = Date.now() + ttl * 1000;

    // Set in memory cache (L1)
    if (this.memoryCache.size >= this.maxMemorySize) {
      this.evictLeastPriority();
    }
    
    this.memoryCache.set(key, {
      value,
      expiry,
      tags,
      priority,
    });

    // Set in Redis cache (L2)
    await this.redisCluster.set(key, value, ttl, { tags, priority, strategy });

    // Update stats
    await this.updateCacheSize();
    
    this.logger.debug(`Cache set for key: ${key} with TTL: ${ttl}s`);
  }

  async invalidate(key: string): Promise<void> {
    // Remove from memory cache
    this.memoryCache.delete(key);
    
    // Remove from Redis
    await this.redisCluster.del(key);
    
    this.stats.invalidations++;
    this.logger.debug(`Cache invalidated for key: ${key}`);
  }

  async invalidateByTag(tag: string): Promise<void> {
    // Find and remove from memory cache
    const keysToDelete: string[] = [];
    for (const [key, item] of this.memoryCache.entries()) {
      if (item.tags.includes(tag)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.memoryCache.delete(key));
    
    // Remove from Redis
    await this.redisCluster.invalidateByTag(tag);
    
    this.stats.invalidations += keysToDelete.length;
    this.logger.debug(`Cache invalidated by tag: ${tag}, removed ${keysToDelete.length} keys`);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    // Remove from memory cache
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    const keysToDelete: string[] = [];
    
    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.memoryCache.delete(key));
    
    // Remove from Redis
    await this.redisCluster.invalidatePattern(pattern);
    
    this.stats.invalidations += keysToDelete.length;
    this.logger.debug(`Cache invalidated by pattern: ${pattern}, removed ${keysToDelete.length} keys`);
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {},
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, options);
    return value;
  }

  async warmCache(patterns: string[]): Promise<void> {
    this.logger.log('Starting cache warming...');
    await this.cacheWarmer.warmCache(patterns);
    this.logger.log('Cache warming completed');
  }

  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total === 0 ? 0 : (this.stats.hits / total) * 100;
    return { ...this.stats };
  }

  async getOptimizationRecommendations(): Promise<any> {
    return this.optimizationService.getRecommendations();
  }

  private evictLeastPriority(): void {
    let lowestPriorityKey = '';
    let lowestPriority = 'high';
    let earliestExpiry = Infinity;

    for (const [key, item] of this.memoryCache.entries()) {
      const priorityOrder = { low: 0, medium: 1, high: 2 };
      const itemPriority = priorityOrder[item.priority as keyof typeof priorityOrder];
      const lowestPriorityOrder = priorityOrder[lowestPriority as keyof typeof priorityOrder];

      if (itemPriority < lowestPriorityOrder || 
          (itemPriority === lowestPriorityOrder && item.expiry < earliestExpiry)) {
        lowestPriorityKey = key;
        lowestPriority = item.priority;
        earliestExpiry = item.expiry;
      }
    }

    if (lowestPriorityKey) {
      this.memoryCache.delete(lowestPriorityKey);
      this.stats.evictions++;
      this.logger.debug(`Evicted key from memory cache: ${lowestPriorityKey}`);
    }
  }

  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanupExpiredItems();
    }, this.cleanupInterval);
  }

  private cleanupExpiredItems(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, item] of this.memoryCache.entries()) {
      if (item.expiry <= now) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.memoryCache.delete(key));
    
    if (keysToDelete.length > 0) {
      this.logger.debug(`Cleaned up ${keysToDelete.length} expired items from memory cache`);
    }
  }

  private async updateCacheSize(): Promise<void> {
    this.stats.memorySize = this.memoryCache.size;
    this.stats.redisSize = await this.redisCluster.getDbSize();
  }
}
