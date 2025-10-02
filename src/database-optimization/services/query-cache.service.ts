import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as LRU from 'lru-cache';

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxItems?: number; // Maximum number of items in cache
}

export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
}

@Injectable()
export class QueryCacheService {
  private readonly logger = new Logger(QueryCacheService.name);
  private readonly cache: LRU<string, any>;
  private readonly stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    size: 0,
  };

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {
    // Initialize LRU cache with default options
    this.cache = new LRU({
      max: 1000, // Maximum 1000 items
      ttl: 5 * 60 * 1000, // 5 minutes TTL
      dispose: () => {
        this.stats.evictions++;
      },
    });

    // Log cache statistics periodically
    setInterval(() => {
      this.logCacheStats();
    }, 60000); // Every minute
  }

  /**
   * Execute a query with caching
   * @param query SQL query string
   * @param parameters Query parameters
   * @param options Cache options
   * @returns Query results
   */
  async executeWithCache(query: string, parameters?: any[], options?: CacheOptions): Promise<any> {
    // Generate cache key
    const cacheKey = this.generateCacheKey(query, parameters);

    // Check if result is in cache
    const cachedResult = this.cache.get(cacheKey);
    if (cachedResult !== undefined) {
      this.stats.hits++;
      this.logger.debug(`Cache HIT for query: ${query.substring(0, 100)}...`);
      return cachedResult;
    }

    this.stats.misses++;
    this.logger.debug(`Cache MISS for query: ${query.substring(0, 100)}...`);

    // Execute query
    const result = await this.dataSource.query(query, parameters);

    // Store result in cache
    const ttl = options?.ttl || 5 * 60 * 1000; // Default 5 minutes
    this.cache.set(cacheKey, result, { ttl });

    return result;
  }

  /**
   * Cache a specific value with a custom key
   * @param key Cache key
   * @param value Value to cache
   * @param options Cache options
   */
  set(key: string, value: any, options?: CacheOptions): void {
    const ttl = options?.ttl || 5 * 60 * 1000; // Default 5 minutes
    this.cache.set(key, value, { ttl });
  }

  /**
   * Get a cached value by key
   * @param key Cache key
   * @returns Cached value or undefined
   */
  get(key: string): any {
    const value = this.cache.get(key);
    if (value !== undefined) {
      this.stats.hits++;
    } else {
      this.stats.misses++;
    }
    return value;
  }

  /**
   * Invalidate cache entries by pattern
   * @param pattern Pattern to match cache keys
   */
  invalidateByPattern(pattern: RegExp): void {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    this.logger.log(`Invalidated ${count} cache entries matching pattern`);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.logger.log(`Cleared ${size} cache entries`);
  }

  /**
   * Get cache statistics
   * @returns Cache statistics
   */
  getStats(): CacheStats {
    return {
      ...this.stats,
      size: this.cache.size,
    };
  }

  /**
   * Generate a cache key from query and parameters
   * @param query SQL query
   * @param parameters Query parameters
   * @returns Cache key
   */
  private generateCacheKey(query: string, parameters?: any[]): string {
    // Create a hash of the query and parameters
    const queryHash = this.simpleHash(query);
    const paramsHash = parameters ? this.simpleHash(JSON.stringify(parameters)) : 'no-params';
    return `query:${queryHash}:${paramsHash}`;
  }

  /**
   * Simple hash function for generating cache keys
   * @param str String to hash
   * @returns Hash string
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  /**
   * Log cache statistics
   */
  private logCacheStats(): void {
    const stats = this.getStats();
    this.logger.debug(
      `Query Cache Stats - Hits: ${stats.hits}, Misses: ${stats.misses}, Hit Rate: ${
        stats.hits + stats.misses > 0
          ? ((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(2)
          : 0
      }%, Size: ${stats.size}`,
    );
  }
}
