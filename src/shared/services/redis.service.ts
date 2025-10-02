import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Service for interacting with Redis, including caching and token blacklisting.
 * Handles connection lifecycle and provides utility methods for Redis operations.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  /**
   * Constructs the RedisService.
   * @param configService - The configuration service for accessing Redis connection settings.
   */
  constructor(private readonly configService: ConfigService) {}

  /**
   * Initializes the Redis client connection on module init.
   */
  onModuleInit() {
    this.client = new Redis({
      host: this.configService.get<string>('cache.redis.host'),
      port: this.configService.get<number>('cache.redis.port'),
      password: this.configService.get<string>('cache.redis.password'),
      db: this.configService.get<number>('cache.redis.db'),
    });
  }

  /**
   * Closes the Redis client connection on module destroy.
   */
  onModuleDestroy() {
    if (this.client) this.client.quit();
  }

  /**
   * Set a value in Redis with optional TTL.
   * @param key Redis key
   * @param value Value to store
   * @param ttlSeconds Optional time-to-live in seconds
   */
  async set(key: string, value: string, ttlSeconds?: number) {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  /**
   * Get a value from Redis by key.
   * @param key Redis key
   * @returns The value or null if not found
   */
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  /**
   * Delete a key from Redis.
   * @param key Redis key
   */
  async del(key: string) {
    await this.client.del(key);
  }

  /**
   * Check if a key exists in Redis.
   * @param key Redis key
   * @returns True if exists, false otherwise
   */
  async exists(key: string): Promise<boolean> {
    return (await this.client.exists(key)) === 1;
  }

  /**
   * Blacklist a token for a specified duration.
   * @param token Token to blacklist
   * @param expiresIn Expiry time in seconds
   */
  async blacklistToken(token: string, expiresIn: number) {
    await this.set(`blacklist:${token}`, '1', expiresIn);
  }

  /**
   * Check if a token is blacklisted.
   * @param token Token to check
   * @returns True if blacklisted, false otherwise
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    return this.exists(`blacklist:${token}`);
  }
}
