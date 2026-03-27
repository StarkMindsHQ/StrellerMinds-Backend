import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { HttpModule } from '@nestjs/axios';
import { MonitoringModule } from '../monitoring/monitoring.module';
import { QueueHealthIndicator } from '../common/queue/health/queue-health.indicator';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '../redis/redis.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    TerminusModule.forRoot({
      errorLogStyle: 'json',
      gracefulShutdownTimeoutMs: 1000,
    }),

    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: {
        enabled: true,
        config: {
          prefix: 'nestjs_',
        },
      },
    }),

    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
    
    MonitoringModule,
    RedisModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [HealthController],
  providers: [HealthService, QueueHealthIndicator],
  exports: [HealthService, QueueHealthIndicator],
})
export class HealthModule {}
