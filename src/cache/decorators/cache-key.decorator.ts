import { SetMetadata } from '@nestjs/common';
import { CacheKeyOptions } from '../interfaces/cache-config.interface';

export const CACHE_KEY_OPTIONS = 'cache_key_options';
export const CacheKey = (options: CacheKeyOptions) => 
  SetMetadata(CACHE_KEY_OPTIONS, options);

export const CacheKeyWithQuery = () => 
  CacheKey({ includeQuery: true });

export const CacheKeyWithHeaders = (headers: string[]) => 
  CacheKey({ includeHeaders: headers });

export const CustomCacheKey = (keyGenerator: (context: any) => string) => 
  CacheKey({ customKey: keyGenerator });
