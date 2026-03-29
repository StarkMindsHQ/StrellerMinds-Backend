import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseConfig } from '../config/database.config';
import { DatabaseMonitorService } from './database.monitor.service';
import { DynamicPoolSizingService } from './dynamic-pool-sizing.service';
import { DatabaseMetricsController } from './database.metrics.controller';
import { BackupService } from './backup/backup.service';
import { ScheduleModule } from '@nestjs/schedule';
import { ReplicaManager } from './ReplicaManager';
import { ConnectionPool } from './ConnectionPool';
import { QueryRouter } from './QueryRouter';
import { DatabaseOptimizationService } from '../services/DatabaseOptimizationService';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useClass: DatabaseConfig,
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [DatabaseMetricsController],
  providers: [
    DatabaseConfig,
    DatabaseMonitorService,
    DynamicPoolSizingService,
    BackupService,
    ReplicaManager,
    ConnectionPool,
    QueryRouter,
    DatabaseOptimizationService,
  ],
  exports: [
    DatabaseConfig,
    DatabaseMonitorService,
    DynamicPoolSizingService,
    DatabaseOptimizationService,
  ],
})
export class DatabaseModule {}
