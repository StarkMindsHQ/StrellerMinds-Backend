import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { CacheService } from './cache.service';
import { CacheInterceptor } from './cache.interceptor';
import { CacheMetricsService } from './cache.metrics';
import { CacheWarmingService } from './cache-warming.service';
import { CacheController } from './cache.controller';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [RedisModule, ScheduleModule.forRoot()],
  controllers: [CacheController],
  providers: [CacheService, CacheInterceptor, CacheMetricsService, CacheWarmingService],
  exports: [CacheService, CacheInterceptor, CacheMetricsService, CacheWarmingService],
})
export class CacheModule {}