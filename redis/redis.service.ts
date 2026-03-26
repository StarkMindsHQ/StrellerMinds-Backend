import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.redis.on('error', (error) => {
      this.logger.error('Redis connection error:', error);
    });

    this.redis.on('connect', () => {
      this.logger.log('Redis connected successfully');
    });

    this.redis.on('ready', () => {
      this.logger.log('Redis ready for commands');
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      this.logger.error(`Redis GET failed for key ${key}:`, error);
      throw error;
    }
  }

  async set(
    key: string,
    value: any,
    ttlSeconds?: number,
  ): Promise<void> {
    try {
      const data = JSON.stringify(value);

      if (ttlSeconds) {
        await this.redis.set(key, data, 'EX', ttlSeconds);
      } else {
        await this.redis.set(key, data);
      }
    } catch (error) {
      this.logger.error(`Redis SET failed for key ${key}:`, error);
      throw error;
    }
  }

  async del(...keys: string[]): Promise<void> {
    try {
      await this.redis.del(...keys);
    } catch (error) {
      this.logger.error(`Redis DEL failed for keys ${keys.join(', ')}:`, error);
      throw error;
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length) {
        await this.redis.del(...keys);
        this.logger.debug(`Invalidated ${keys.length} keys matching pattern: ${pattern}`);
      }
    } catch (error) {
      this.logger.error(`Redis pattern invalidation failed for pattern ${pattern}:`, error);
      throw error;
    }
  }

  async getRedisInfo(): Promise<any> {
    try {
      const info = await this.redis.info();
      const memory = await this.redis.info('memory');
      const keyspace = await this.redis.info('keyspace');
      
      return {
        info: this.parseRedisInfo(info),
        memory: this.parseRedisInfo(memory),
        keyspace: this.parseRedisInfo(keyspace),
      };
    } catch (error) {
      this.logger.error('Failed to get Redis info:', error);
      return null;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Redis EXISTS failed for key ${key}:`, error);
      return false;
    }
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      const result = await this.redis.expire(key, seconds);
      return result === 1;
    } catch (error) {
      this.logger.error(`Redis EXPIRE failed for key ${key}:`, error);
      return false;
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      return await this.redis.ttl(key);
    } catch (error) {
      this.logger.error(`Redis TTL failed for key ${key}:`, error);
      return -1;
    }
  }

  async flushdb(): Promise<void> {
    try {
      await this.redis.flushdb();
      this.logger.warn('Redis database flushed');
    } catch (error) {
      this.logger.error('Redis FLUSHDB failed:', error);
      throw error;
    }
  }

  async ping(): Promise<string> {
    try {
      return await this.redis.ping();
    } catch (error) {
      this.logger.error('Redis PING failed:', error);
      throw error;
    }
  }

  isConnected(): boolean {
    return this.redis.status === 'ready';
  }

  private parseRedisInfo(info: string): Record<string, any> {
    const lines = info.split('\r\n');
    const result: Record<string, any> = {};
    
    for (const line of lines) {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        if (key && value) {
          // Handle nested keys like db0
          if (key.includes('db')) {
            const [db, dbKey] = key.split('_');
            if (!result[db]) result[db] = {};
            result[db][dbKey] = isNaN(Number(value)) ? value : Number(value);
          } else {
            result[key] = isNaN(Number(value)) ? value : Number(value);
          }
        }
      }
    }
    
    return result;
  }

  async onModuleDestroy() {
    try {
      await this.redis.quit();
      this.logger.log('Redis connection closed');
    } catch (error) {
      this.logger.error('Error closing Redis connection:', error);
    }
  }
}