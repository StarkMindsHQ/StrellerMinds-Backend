import { Module, Global } from '@nestjs/common';
import { BackupService } from './backup/backup.service';
import { DatabaseMonitorService } from './database.monitor.service';
import { DatabaseMetricsController } from './database.metrics.controller';

/**
 * Global module for database utilities
 * Provides backup, monitoring, and metrics services
 */
@Global()
@Module({
    providers: [BackupService, DatabaseMonitorService],
    controllers: [DatabaseMetricsController],
    exports: [BackupService, DatabaseMonitorService],
})
export class DatabaseModule { }
