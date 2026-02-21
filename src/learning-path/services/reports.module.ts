import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './controllers/reports.controller';
import { ReportBuilderService } from './services/report-builder.service';
import { ReportGeneratorService } from './services/report-generator.service';
import { ReportSchedulerService } from './services/report-scheduler.service';
import { ReportTemplate } from './entities/report-template.entity';
import { ReportSchedule } from './entities/report-schedule.entity';
import { GeneratedReport } from './entities/generated-report.entity';

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