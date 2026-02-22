import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
    });
  }

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async set(
    key: string,
    value: any,
    ttlSeconds?: number,
  ): Promise<void> {
    const data = JSON.stringify(value);

    if (ttlSeconds) {
      await this.redis.set(key, data, 'EX', ttlSeconds);
    } else {
      await this.redis.set(key, data);
    }
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async invalidatePattern(pattern: string) {
    const keys = await this.redis.keys(pattern);
    if (keys.length) {
      await this.redis.del(...keys);
    }
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}