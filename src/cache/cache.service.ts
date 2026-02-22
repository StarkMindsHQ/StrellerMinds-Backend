import { Injectable } from '@nestjs/common';
import { RedisService } from 'redis/redis.service';

@Injectable()
export class CacheService {
  private hits = 0;
  private misses = 0;

  constructor(private readonly redis: RedisService) {}

  async getOrSet<T>(
    key: string,
    handler: () => Promise<T>,
    ttl = 60,
  ): Promise<T> {
    const cached = await this.redis.get<T>(key);

    if (cached) {
      this.hits++;
      return cached;
    }

    this.misses++;

    const result = await handler();
    await this.redis.set(key, result, ttl);

    return result;
  }

  async invalidate(key: string) {
    await this.redis.del(key);
  }

  async invalidatePattern(pattern: string) {
    await this.redis.invalidatePattern(pattern);
  }

  getStats() {
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate:
        this.hits + this.misses === 0
          ? 0
          : (this.hits / (this.hits + this.misses)) * 100,
    };
  }
}