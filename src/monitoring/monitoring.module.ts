import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PerformanceMetric } from './entities/performance-metric.entity';
import { PerformanceReport } from './entities/performance-report.entity';
import { QueryOptimization } from './entities/query-optimization.entity';
import { ApmService } from './services/apm.service';
import { DatabaseOptimizationService } from './services/database-optimization.service';
import { CacheOptimizationService } from './services/cache-optimization.service';
import { PerformanceTuningService } from './services/performance-tuning.service';
import { PerformanceAnalyticsService } from './services/performance-analytics.service';
import { LoadTestingService } from './services/load-testing.service';
import { OptimizationRecommendationsService } from './services/optimization-recommendations.service';
import { MonitoringController } from './controllers/monitoring.controller';
import { PerformanceInterceptor } from './interceptors/performance.interceptor';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PerformanceMetric, PerformanceReport, QueryOptimization]),
    HttpModule,
    CacheModule,
    EventEmitterModule,
    DatabaseModule,
  ],
  controllers: [MonitoringController],
  providers: [
    ApmService,
    DatabaseOptimizationService,
    CacheOptimizationService,
    PerformanceTuningService,
    PerformanceAnalyticsService,
    LoadTestingService,
    OptimizationRecommendationsService,
    PerformanceInterceptor,
  ],
  exports: [
    ApmService,
    DatabaseOptimizationService,
    CacheOptimizationService,
    PerformanceTuningService,
    PerformanceAnalyticsService,
    LoadTestingService,
    OptimizationRecommendationsService,
    PerformanceInterceptor,
  ],
})
export class MonitoringModule {}
