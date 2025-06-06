import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ICacheStrategy } from '../interfaces/cache-strategy.interface';
import { CacheStrategy } from '../enums/cache-strategy.enum';

@Injectable()
export class CacheService implements ICacheStrategy {
  private readonly logger = new Logger(CacheService.name);
  private strategy: ICacheStrategy;

  constructor(
    private configService: ConfigService,
  ) {
    this.initializeStrategy();
  }

  private initializeStrategy(): void {
    const strategyType = this.configService.get<CacheStrategy>('cache.strategy');
    
    switch (strategyType) {
      case CacheStrategy.REDIS:
        this.strategy = new RedisCacheStrategy(this.configService);
        break;
      case CacheStrategy.MEMCACHED:
        this.strategy = new MemcachedCacheStrategy(this.configService);
        break;
      case CacheStrategy.MEMORY:
      default:
        this.strategy = new MemoryCacheStrategy(this.configService);
        break;
    }
  }

  async get(key: string): Promise<any> {
    try {
      const result = await this.strategy.get(key);
      if (result) {
        this.logger.debug(`Cache hit for key: ${key}`);
        return JSON.parse(result);
      }
      this.logger.debug(`Cache miss for key: ${key}`);
      return null;
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      await this.strategy.set(key, serializedValue, ttl);
      this.logger.debug(`Cache set for key: ${key}, TTL: ${ttl}`);
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.strategy.del(key);
      this.logger.debug(`Cache deleted for key: ${key}`);
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}:`, error);
    }
  }

  async clear(pattern?: string): Promise<void> {
    try {
      await this.strategy.clear(pattern);
      this.logger.debug(`Cache cleared with pattern: ${pattern || 'all'}`);
    } catch (error) {
      this.logger.error(`Cache clear error:`, error);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      return await this.strategy.exists(key);
    } catch (error) {
      this.logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      return await this.strategy.ttl(key);
    } catch (error) {
      this.logger.error(`Cache TTL error for key ${key}:`, error);
      return -1;
    }
  }
}

class MemoryCacheStrategy implements ICacheStrategy {
  private cache = new Map<string, { value: string; expires: number }>();

  constructor(private configService: ConfigService) {}

  async get(key: string): Promise<any> {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    const defaultTtl = this.configService.get<number>('cache.ttl') * 1000;
    const expires = Date.now() + (ttl ? ttl * 1000 : defaultTtl);
    this.cache.set(key, { value, expires });
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(pattern?: string): Promise<void> {
    if (pattern) {
      const regex = new RegExp(pattern);
      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  async exists(key: string): Promise<boolean> {
    return this.cache.has(key);
  }

  async ttl(key: string): Promise<number> {
    const item = this.cache.get(key);
    if (!item) return -2;
    
    const remaining = item.expires - Date.now();
    return remaining > 0 ? Math.floor(remaining / 1000) : -1;
  }
}

class RedisCacheStrategy implements ICacheStrategy {
  private client: any; 

  constructor(private configService: ConfigService) {
    const redis = require('redis');
    const redisConfig = this.configService.get('cache.redis');
    this.client = redis.createClient(redisConfig);
  }

  async get(key: string): Promise<any> {
    return await this.client.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.setex(key, ttl, value);
    } else {
      const defaultTtl = this.configService.get<number>('cache.ttl');
      await this.client.setex(key, defaultTtl, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async clear(pattern?: string): Promise<void> {
    if (pattern) {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } else {
      await this.client.flushdb();
    }
  }

  async exists(key: string): Promise<boolean> {
    return (await this.client.exists(key)) === 1;
  }

  async ttl(key: string): Promise<number> {
    return await this.client.ttl(key);
  }
}
