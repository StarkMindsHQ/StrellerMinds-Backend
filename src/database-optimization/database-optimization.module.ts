import { Module, type DynamicModule } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { QueryAnalyzerService } from './services/query-analyzer.service';
import { PerformanceMonitorService } from './services/performance-monitor.service';
import { QueryCacheService } from './services/query-cache.service';
import { DatabaseDashboardService } from './services/database-dashboard.service';
import { DatabaseDashboardController } from './controllers/database-dashboard.controller';
import {
  DatabaseOptimizationConfig,
  DEFAULT_OPTIMIZATION_CONFIG,
} from './interfaces/optimization-config.interface';

@Module({})
export class DatabaseOptimizationModule {
  static forRoot(config?: Partial<DatabaseOptimizationConfig>): DynamicModule {
    const optimizationConfig = {
      ...DEFAULT_OPTIMIZATION_CONFIG,
      ...config,
    };

    return {
      module: DatabaseOptimizationModule,
      imports: [ScheduleModule.forRoot()],
      providers: [
        {
          provide: 'DATABASE_OPTIMIZATION_CONFIG',
          useValue: optimizationConfig,
        },
        QueryAnalyzerService,
        PerformanceMonitorService,
        QueryCacheService,
        DatabaseDashboardService,
      ],
      controllers: [DatabaseDashboardController],
      exports: [
        QueryAnalyzerService,
        PerformanceMonitorService,
        QueryCacheService,
        DatabaseDashboardService,
      ],
      global: true,
    };
  }

  static forFeature(): DynamicModule {
    return {
      module: DatabaseOptimizationModule,
      providers: [
        QueryAnalyzerService,
        PerformanceMonitorService,
        QueryCacheService,
        DatabaseDashboardService,
      ],
      controllers: [DatabaseDashboardController],
      exports: [
        QueryAnalyzerService,
        PerformanceMonitorService,
        QueryCacheService,
        DatabaseDashboardService,
      ],
    };
  }
}
