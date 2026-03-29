import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerStorageRedisService } from 'nestjs-throttler-storage-redis';
import Redis from 'ioredis';
import { RateLimitAnalytics } from './entities/rate-limit-analytics.entity';
import { AdvancedThrottlerGuard } from './guards/advanced-throttler.guard';
import { RateLimitService } from './services/rate-limit.service';
import { AdaptiveRateLimiter } from './AdaptiveRateLimiter';
import { ThreatDetector } from './ThreatDetector';
import { RateLimitingService } from '../services/RateLimitingService';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([RateLimitAnalytics]),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: config.get('RATE_LIMIT_TTL', 60000),
            limit: config.get('RATE_LIMIT_MAX', 10),
          },
          {
            name: 'auth',
            ttl: 60000,
            limit: 5,
          },
          {
            name: 'sensitive',
            ttl: 60000,
            limit: 3,
          },
        ],
        storage: new ThrottlerStorageRedisService(
          new Redis({
            host: config.get('REDIS_HOST', 'localhost'),
            port: config.get('REDIS_PORT', 6379),
            password: config.get('REDIS_PASSWORD'),
          }),
        ),
      }),
    }),
  ],
  providers: [
    AdvancedThrottlerGuard,
    RateLimitService,
    AdaptiveRateLimiter,
    ThreatDetector,
    RateLimitingService,
  ],
  exports: [
    ThrottlerModule,
    TypeOrmModule,
    AdvancedThrottlerGuard,
    RateLimitService,
    AdaptiveRateLimiter,
    ThreatDetector,
    RateLimitingService,
  ],
})
export class RateLimitModule {}