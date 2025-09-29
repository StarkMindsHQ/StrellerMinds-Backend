import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';

import { EnhancedMigrationService } from './enhanced-migration.service';
import { DataValidationService } from './data-validation.service';
import { MigrationMonitoringService } from './migration-monitoring.service';
import { MigrationManagerService } from './migration-manager.service';
import { MigrationController } from './migration.controller';

// Import existing migrations
import { AddForeignKeyConstraints1704067200000 } from './migrations/1704067200000-AddForeignKeyConstraints';
import { OptimizeIndexes1704067300000 } from './migrations/1704067300000-OptimizeIndexes';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      // Add any database entities here if needed
    ]),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
  ],
  providers: [
    EnhancedMigrationService,
    DataValidationService,
    MigrationMonitoringService,
    MigrationManagerService,
  ],
  controllers: [MigrationController],
  exports: [
    EnhancedMigrationService,
    DataValidationService,
    MigrationMonitoringService,
    MigrationManagerService,
  ],
})
export class DatabaseModule {}
