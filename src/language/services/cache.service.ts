import { Injectable } from '@nestjs/common';

/**
 * Simple in-memory cache service for storing key-value pairs with optional TTL.
 */
@Injectable()
export class CacheService {
  private cache: Map<string, { value: any; expiry: number }> = new Map();

  /**
   * Get a value from the cache by key.
   * @param key Cache key
   * @returns The cached value or null if not found/expired
   */
  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    // Check if item has expired
    if (item.expiry && item.expiry < Date.now()) {
      this.cache.delete(key);
      return null;
    }

    return item.value as T;
  }

  /**
   * Set a value in the cache with an optional TTL.
   * @param key Cache key
   * @param value Cache value
   * @param ttlSeconds Time to live in seconds
   */
  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const expiry = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.cache.set(key, { value, expiry });
  }

  /**
   * Delete a value from the cache by key.
   * @param key Cache key
   */
  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  /**
   * Clear the entire cache.
   */
  async clear(): Promise<void> {
    this.cache.clear();
  }

  /**
   * Get all keys matching a pattern.
   * @param pattern Pattern to match keys against
   * @returns Array of matching keys
   */
  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(pattern.replace('*', '.*'));
    return Array.from(this.cache.keys()).filter((key) => regex.test(key));
  }
}
