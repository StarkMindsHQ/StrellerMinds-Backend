import { registerAs } from '@nestjs/config';

enum CacheStrategy {
  MEMORY = 'memory',
  REDIS = 'redis',
  MEMCACHED = 'memcached',
}

export default registerAs('cache', () => ({
  strategy: process.env.CACHE_STRATEGY || CacheStrategy.MEMORY,
  ttl: parseInt(process.env.CACHE_TTL) || 300,
  max: parseInt(process.env.CACHE_MAX_ITEMS) || 1000,
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB) || 0,
  },
  memcached: {
    servers: process.env.MEMCACHED_SERVERS?.split(',') || ['localhost:11211'],
  },
  endpoints: {
    users: {
      ttl: 600,
      strategy: CacheStrategy.REDIS,
      invalidateOn: ['user:update', 'user:delete'],
    },
    products: {
      ttl: 1800,
      strategy: CacheStrategy.REDIS,
      invalidateOn: ['product:update', 'product:delete', 'inventory:update'],
    },
    analytics: {
      ttl: 3600,
      strategy: CacheStrategy.REDIS,
      invalidateOn: ['data:refresh'],
    },
    publicData: {
      ttl: 7200,
      strategy: CacheStrategy.MEMORY,
      invalidateOn: ['content:update'],
    },
  },
}));
