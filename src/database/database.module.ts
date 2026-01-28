import { Module, Global } from '@nestjs/common';
import { DatabaseMonitorService } from './database.monitor.service';
import { DatabaseMetricsController } from './database.metrics.controller';
import { BackupModule } from './backup/backup.module';

/**
 * Global module for database utilities
 * Provides backup, monitoring, and metrics services
 */
@Global()
@Module({
  imports: [BackupModule],
  providers: [DatabaseMonitorService],
  controllers: [DatabaseMetricsController],
  exports: [DatabaseMonitorService, BackupModule],
})
export class DatabaseModule {}
