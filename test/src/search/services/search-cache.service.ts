import { Injectable } from "@nestjs/common"
import type { Cache } from "cache-manager"
import type { ConfigService } from "@nestjs/config"
import type { SearchResult } from "../interfaces/search.interface"

@Injectable()
export class SearchCacheService {
  private readonly defaultTTL: number
  private cacheManager: Cache

  constructor(
    cacheManager: Cache,
    private configService: ConfigService,
  ) {
    this.cacheManager = cacheManager
    this.defaultTTL = this.configService.get<number>("SEARCH_CACHE_TTL", 300) // 5 minutes default
  }

  async get(key: string): Promise<SearchResult | null> {
    try {
      return await this.cacheManager.get<SearchResult>(key)
    } catch (error) {
      console.error("Cache get error:", error)
      return null
    }
  }

  async set(key: string, value: SearchResult, ttl?: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl || this.defaultTTL)
    } catch (error) {
      console.error("Cache set error:", error)
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key)
    } catch (error) {
      console.error("Cache delete error:", error)
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      // Implementation depends on cache store (Redis, Memory, etc.)
      // For Redis: use SCAN with pattern matching
      // For Memory: iterate through keys
      const keys = await this.cacheManager.store.keys()
      const matchingKeys = keys.filter((key: string) => key.includes(pattern.replace("*", "")))

      await Promise.all(matchingKeys.map((key) => this.cacheManager.del(key)))
    } catch (error) {
      console.error("Cache invalidation error:", error)
    }
  }

  async clear(): Promise<void> {
    try {
      await this.cacheManager.reset()
    } catch (error) {
      console.error("Cache clear error:", error)
    }
  }

  async getStats(): Promise<any> {
    try {
      // Implementation depends on cache store
      return {
        keys: await this.cacheManager.store.keys(),
        // Add more stats as needed
      }
    } catch (error) {
      console.error("Cache stats error:", error)
      return {}
    }
  }
}
