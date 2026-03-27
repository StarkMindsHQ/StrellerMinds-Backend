import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { QueryPerformanceInterceptor } from './interceptors/query-performance.interceptor';
import { DatabaseOptimizationService } from './services/database-optimization.service';
import { QueryCacheService } from '../cache/services/query-cache.service';
import { OptimizedPaginationService } from '../common/pagination/optimized-pagination.service';
import { APP_INTERCEPTOR } from '@nestjs/core';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        entities: ['dist/**/*.entity{.ts,.js}'],
        synchronize: configService.get<boolean>('DB_SYNCHRONIZE', false),
        logging: configService.get<boolean>('DB_LOGGING', true),
        // Performance optimizations
        extra: {
          max: configService.get<number>('DB_POOL_MAX', 20),
          min: configService.get<number>('DB_POOL_MIN', 5),
          idleTimeoutMillis: configService.get<number>('DB_IDLE_TIMEOUT', 30000),
          connectionTimeoutMillis: configService.get<number>('DB_CONNECTION_TIMEOUT', 2000),
        },
        // Enable query statistics for monitoring
        logQueries: configService.get<boolean>('DB_LOG_QUERIES', false),
        maxQueryExecutionTime: configService.get<number>('DB_SLOW_QUERY_THRESHOLD', 1000),
      }),
      inject: [ConfigService],
    }),
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        ttl: configService.get<number>('CACHE_TTL', 300), // 5 minutes default
        max: configService.get<number>('CACHE_MAX_ITEMS', 1000),
        isGlobal: true,
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    DatabaseOptimizationService,
    QueryCacheService,
    OptimizedPaginationService,
    {
      provide: APP_INTERCEPTOR,
      useClass: QueryPerformanceInterceptor,
    },
  ],
  exports: [
    DatabaseOptimizationService,
    QueryCacheService,
    OptimizedPaginationService,
  ],
})
export class DatabaseOptimizationModule {}
