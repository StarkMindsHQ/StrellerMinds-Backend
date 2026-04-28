import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';

@Injectable()
export class RedisPoolService {
  private readonly client: Redis;

  constructor(private readonly config: ConfigService) {
    const options: RedisOptions = {
      host: this.config.get<string>('REDIS_HOST', 'localhost'),
      port: this.config.get<number>('REDIS_PORT', 6379),
      password: this.config.get<string>('REDIS_PASSWORD'),
      db: this.config.get<number>('REDIS_DB', 0),
      // Connection pool settings
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
      // Keep-alive to reuse connections
      keepAlive: 10_000,
      connectTimeout: 10_000,
      commandTimeout: 5_000,
      // Reconnect strategy
      retryStrategy: (times: number) => Math.min(times * 100, 3_000),
    };

    this.client = new Redis(options);
  }

  getClient(): Redis {
    return this.client;
  }

  async ping(): Promise<string> {
    return this.client.ping();
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}
