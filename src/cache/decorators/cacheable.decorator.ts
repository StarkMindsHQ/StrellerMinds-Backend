import { SetMetadata } from '@nestjs/common';
import { CacheConfig } from '../interfaces/cache-config.interface';

export const CACHEABLE_KEY = 'cacheable';
export const Cacheable = (config: CacheConfig) => SetMetadata(CACHEABLE_KEY, config);

export const CacheForMinutes = (minutes: number) => 
  Cacheable({ ttl: minutes * 60 });

export const CacheForHours = (hours: number) => 
  Cacheable({ ttl: hours * 3600 });

export const CacheForDays = (days: number) => 
  Cacheable({ ttl: days * 86400 });

export const CacheUserData = () => 
  Cacheable({ 
    ttl: 600, 
    invalidateOn: ['user:update', 'user:delete'],
    keyPrefix: 'user'
  });

export const CacheProductData = () => 
  Cacheable({ 
    ttl: 1800, 
    invalidateOn: ['product:update', 'product:delete'],
    keyPrefix: 'product'
  });

export const CachePublicData = () => 
  Cacheable({ 
    ttl: 3600, 
    invalidateOn: ['content:update'],
    keyPrefix: 'public'
  });
