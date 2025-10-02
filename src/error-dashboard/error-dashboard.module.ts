import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ErrorDashboardController } from './error-dashboard.controller';
import { ErrorDashboardService } from './error-dashboard.service';
import { LoggingModule } from '../common/logging/logging.module';
import { AlertingModule } from '../common/alerting/alerting.module';
import { ErrorLog } from '../common/entities/error-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ErrorLog]), LoggingModule, AlertingModule],
  controllers: [ErrorDashboardController],
  providers: [ErrorDashboardService],
  exports: [ErrorDashboardService],
})
export class ErrorDashboardModule {}
