import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CacheService } from './services/cache.service';
import { CacheManagerService } from './services/cache-manager.service';
import { CacheInvalidationService } from './services/cache-invalidation.service';
import { CacheInterceptor } from './interceptors/cache.interceptor';
import { CacheInvalidationInterceptor } from './interceptors/cache-invalidation.interceptor';
import { CacheConditionGuard } from './guards/cache-condition.guard';
import cacheConfig from '../config/cache.config';

@Global()
@Module({
  imports: [
    ConfigModule.forFeature(cacheConfig),
    EventEmitterModule,
  ],
  providers: [
    CacheService,
    CacheManagerService,
    CacheInvalidationService,
    CacheInterceptor,
    CacheInvalidationInterceptor,
    CacheConditionGuard,
  ],
  exports: [
    CacheService,
    CacheManagerService,
    CacheInvalidationService,
    CacheInterceptor,
    CacheInvalidationInterceptor,
  ],
})
export class CacheModule {}
