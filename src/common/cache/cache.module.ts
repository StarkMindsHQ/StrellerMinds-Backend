import { Global, Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueryCacheService } from './query-cache.service';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ttl: config.get<number>('CACHE_TTL_MS', 60_000),
        max: config.get<number>('CACHE_MAX_ITEMS', 500),
      }),
    }),
  ],
  providers: [QueryCacheService],
  exports: [QueryCacheService, CacheModule],
})
export class AppCacheModule {}
