import { Module, DynamicModule, Global } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MonitoringConfig } from './interfaces/monitoring-config.interface';
import { MetricsCollectorService } from './services/metrics-collector.service';
import { HealthCheckService } from './services/health-check.service';
import { AlertService } from './services/alert.service';
import { CustomLoggerService } from './services/logger.service';

@Global()
@Module({})
export class MonitoringModule {
  static forRoot(config: MonitoringConfig = {}): DynamicModule {
    const defaultConfig: MonitoringConfig = {
      enableMetrics: true,
      enableHealthChecks: true,
      enableAlerts: true,
      metricsInterval: 30000,
      healthCheckInterval: 60000,
      logLevel: 'info' as any,
      retentionPeriod: 86400000, // 24 hours
      alertThresholds: {
        cpuUsage: 80,
        memoryUsage: 85,
        responseTime: 5000,
        errorRate: 5,
        diskUsage: 90,
      },
      ...config,
    };

    return {
      module: MonitoringModule,
      imports: [ScheduleModule.forRoot()],
      providers: [
        {
          provide: 'MONITORING_CONFIG',
          useValue: defaultConfig,
        },
        {
          provide: MonitoringConfig,
          useValue: defaultConfig,
        },
        MetricsCollectorService,
        HealthCheckService,
        AlertService,
        CustomLoggerService,
      ],
      exports: [
        MetricsCollectorService,
        HealthCheckService,
        AlertService,
        CustomLoggerService,
        MonitoringConfig,
      ],
    };
  }

  static forRootAsync(options: {
    useFactory: (...args: any[]) => Promise<MonitoringConfig> | MonitoringConfig;
    inject?: any[];
  }): DynamicModule {
    return {
      module: MonitoringModule,
      imports: [ScheduleModule.forRoot()],
      providers: [
        {
          provide: 'MONITORING_CONFIG',
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        {
          provide: MonitoringConfig,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        MetricsCollectorService,
        HealthCheckService,
        AlertService,
        CustomLoggerService,
      ],
      exports: [
        MetricsCollectorService,
        HealthCheckService,
        AlertService,
        CustomLoggerService,
        MonitoringConfig,
      ],
    };
  }
}
