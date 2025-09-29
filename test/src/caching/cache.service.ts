import { Injectable, Logger } from "@nestjs/common"
import type { Cache } from "cache-manager"
import type { ConfigService } from "@nestjs/config"

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name)
  private readonly defaultTTL: number // Default TTL in seconds

  constructor(
    private cacheManager: Cache,
    private configService: ConfigService,
  ) {
    this.defaultTTL = this.configService.get<number>("CACHE_TTL", 300) // 5 minutes default
  }

  /**
   * Retrieves data from the cache.
   * @param key The cache key.
   * @returns The cached data or null if not found.
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.cacheManager.get<T>(key)
      if (data) {
        this.logger.debug(`Cache HIT for key: ${key}`)
      } else {
        this.logger.debug(`Cache MISS for key: ${key}`)
      }
      return data
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}: ${error.message}`, error.stack)
      return null
    }
  }

  /**
   * Stores data in the cache.
   * @param key The cache key.
   * @param value The data to store.
   * @param ttl Optional time-to-live in seconds. Defaults to configured CACHE_TTL.
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl || this.defaultTTL)
      this.logger.debug(`Cache SET for key: ${key} with TTL: ${ttl || this.defaultTTL}s`)
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}: ${error.message}`, error.stack)
    }
  }

  /**
   * Deletes a specific key from the cache.
   * @param key The cache key to delete.
   */
  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key)
      this.logger.debug(`Cache DEL for key: ${key}`)
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}: ${error.message}`, error.stack)
    }
  }

  /**
   * Invalidates cache entries matching a given pattern.
   * Note: This operation can be expensive for large caches, especially with non-Redis stores.
   * For Redis, it uses `KEYS` or `SCAN` which can be blocking. Use with caution.
   * @param pattern The pattern to match (e.g., "search:*", "user:123:*").
   */
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      // This implementation assumes a Redis store or a store that supports keys() and del() efficiently.
      // For production, consider using Redis's SCAN command for large datasets to avoid blocking.
      const keys: string[] = await this.cacheManager.store.keys(pattern) // 'keys' method might support patterns directly depending on the store
      if (keys && keys.length > 0) {
        await Promise.all(keys.map((key) => this.cacheManager.del(key)))
        this.logger.debug(`Invalidated ${keys.length} keys matching pattern: ${pattern}`)
      } else {
        this.logger.debug(`No keys found to invalidate for pattern: ${pattern}`)
      }
    } catch (error) {
      this.logger.error(`Cache invalidation error for pattern ${pattern}: ${error.message}`, error.stack)
    }
  }

  /**
   * Clears the entire cache. Use with extreme caution.
   */
  async clear(): Promise<void> {
    try {
      await this.cacheManager.reset()
      this.logger.warn("Cache CLEARED entirely.")
    } catch (error) {
      this.logger.error(`Cache clear error: ${error.message}`, error.stack)
    }
  }

  /**
   * Retrieves statistics about the cache.
   * The actual stats available depend on the underlying cache store.
   * @returns Cache statistics.
   */
  async getStats(): Promise<any> {
    try {
      // This is a placeholder. Real-world stats would depend on the Redis client.
      // For example, using 'ioredis' client directly: await this.cacheManager.store.getClient().info();
      const keys = await this.cacheManager.store.keys("*")
      return {
        totalKeys: keys.length,
        // Add more specific Redis stats if directly accessing the client
      }
    } catch (error) {
      this.logger.error(`Cache stats error: ${error.message}`, error.stack)
      return {}
    }
  }
}
