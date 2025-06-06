import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CacheService } from './cache.service';
import { CacheEvent } from '../enums/cache-strategy.enum';

@Injectable()
export class CacheManagerService {
  private readonly logger = new Logger(CacheManagerService.name);

  constructor(
    private cacheService: CacheService,
    private eventEmitter: EventEmitter2,
  ) {}

  generateCacheKey(
    method: string,
    url: string,
    query?: any,
    headers?: any,
    body?: any,
    prefix?: string,
  ): string {
    const baseKey = `${method}:${url}`;
    const parts = [baseKey];

    if (query && Object.keys(query).length > 0) {
      const sortedQuery = Object.keys(query)
        .sort()
        .reduce((result, key) => {
          result[key] = query[key];
          return result;
        }, {});
      parts.push(`query:${JSON.stringify(sortedQuery)}`);
    }

    if (headers) {
      const headersPart = Object.keys(headers)
        .sort()
        .map(key => `${key}:${headers[key]}`)
        .join(',');
      parts.push(`headers:${headersPart}`);
    }

    if (body) {
      parts.push(`body:${JSON.stringify(body)}`);
    }

    const key = parts.join('|');
    return prefix ? `${prefix}:${key}` : key;
  }

  async cacheResponse(
    key: string,
    data: any,
    ttl?: number,
    tags: string[] = [],
  ): Promise<void> {
    const cacheData = {
      data,
      timestamp: Date.now(),
      tags,
    };

    await this.cacheService.set(key, cacheData, ttl);
    this.logger.debug(`Response cached with key: ${key}`);
  }
  async getCachedResponse(key: string): Promise<any> {
    const cached = await this.cacheService.get(key);
    if (cached) {
      this.logger.debug(`Cache hit for key: ${key}`);
      return cached.data;
    }
    this.logger.debug(`Cache miss for key: ${key}`);
    return null;
  }

  async invalidateCache(
    patterns: string[] = [],
    tags: string[] = [],
  ): Promise<void> {
    try {
      for (const pattern of patterns) {
        await this.cacheService.clear(pattern);
        this.logger.debug(`Cache invalidated by pattern: ${pattern}`);
      }

      if (tags.length > 0) {
        await this.invalidateByTags(tags);
      }

      this.eventEmitter.emit('cache.invalidated', { patterns, tags });
    } catch (error) {
      this.logger.error('Error during cache invalidation:', error);
    }
  }

  private async invalidateByTags(tags: string[]): Promise<void> {
    this.logger.debug(`Cache invalidation by tags: ${tags.join(', ')}`);
  }

  async getCacheStats(): Promise<any> {
    return {
    };
  }

  async warmUpCache(endpoints: Array<{ key: string; data: any; ttl?: number }>): Promise<void> {
    for (const endpoint of endpoints) {
      await this.cacheResponse(endpoint.key, endpoint.data, endpoint.ttl);
    }
    this.logger.log(`Cache warmed up with ${endpoints.length} entries`);
  }
}
