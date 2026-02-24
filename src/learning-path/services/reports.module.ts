import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportBuilderService } from './report-builder.service';
import { ReportGeneratorService } from './report-generator.service';
import { ReportSchedulerService } from './report-scheduler.service';
import { ReportTemplate } from './report-template.entity';
import { ReportSchedule } from './report-schedule.entity';
import { GeneratedReport } from './generated-report.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReportTemplate, ReportSchedule, GeneratedReport]),
  ],
  controllers: [ReportsController],
  providers: [
    ReportBuilderService,
    ReportGeneratorService,
    ReportSchedulerService,
  ],
})
export class ReportsModule {}