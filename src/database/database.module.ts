import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseConfig } from '../config/database.config';
import { DatabaseMonitorService } from './database.monitor.service';
import { DynamicPoolSizingService } from './dynamic-pool-sizing.service';
import { DatabaseMetricsController } from './database.metrics.controller';
import { BackupService } from './backup/backup.service';
import { ScheduleModule } from '@nestjs/schedule';
import { ConnectionPoolMonitor } from './connection-pool.monitor';
import { ConnectionPoolManager } from './connection-pool.manager';
import { ConnectionPoolController } from './connection-pool.controller';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useClass: DatabaseConfig,
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [DatabaseMetricsController, ConnectionPoolController],
  providers: [
    DatabaseConfig,
    DatabaseMonitorService,
    DynamicPoolSizingService,
    BackupService,
    ConnectionPoolMonitor,
    ConnectionPoolManager,
  ],
  exports: [
    DatabaseConfig,
    DatabaseMonitorService,
    DynamicPoolSizingService,
    ConnectionPoolMonitor,
    ConnectionPoolManager,
  ],
})
export class DatabaseModule {}