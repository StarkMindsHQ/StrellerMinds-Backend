import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { ReportSchedule, ScheduleFrequency } from '../entities/report-schedule.entity';
import { AnalyticsService } from './analytics.service';
import { ReportBuilderService } from './report-builder.service';
import { DataExportService } from './data-export.service';

@Injectable()
export class ReportGenerationService {
  private readonly logger = new Logger(ReportGenerationService.name);

  constructor(
    @InjectRepository(ReportSchedule)
    private scheduleRepository: Repository<ReportSchedule>,
    private analyticsService: AnalyticsService,
    private reportBuilderService: ReportBuilderService,
    private dataExportService: DataExportService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async processScheduledReports(): Promise<void> {
    this.logger.log('Processing scheduled reports...');

    const dueSchedules = await this.scheduleRepository.find({
      where: {
        isActive: true,
        nextRunAt: LessThan(new Date()),
      },
      relations: ['createdBy'],
    });

    for (const schedule of dueSchedules) {
      try {
        await this.generateScheduledReport(schedule);
      } catch (error) {
        this.logger.error(
          `Failed to generate scheduled report ${schedule.id}: ${error.message}`,
        );
      }
    }
  }

  async generateScheduledReport(schedule: ReportSchedule): Promise<void> {
    this.logger.log(`Generating scheduled report: ${schedule.name}`);

    const report = await this.reportBuilderService.createReport(
      schedule.createdById,
      {
        name: `${schedule.name} - ${new Date().toISOString()}`,
        description: schedule.description,
        reportType: schedule.reportConfiguration.reportType,
        configuration: schedule.reportConfiguration,
      },
    );

    const generatedReport = await this.analyticsService.generateReport(report.id);

    if (schedule.exportFormats && schedule.exportFormats.length > 0) {
      for (const format of schedule.exportFormats) {
        await this.dataExportService.exportReport(
          generatedReport.data,
          format as any,
        );
      }
    }

    schedule.lastRunAt = new Date();
    schedule.nextRunAt = this.calculateNextRunDate(schedule.frequency);
    await this.scheduleRepository.save(schedule);

    this.logger.log(`Scheduled report ${schedule.name} generated successfully`);
  }

  async createSchedule(
    userId: string,
    scheduleData: Partial<ReportSchedule>,
  ): Promise<ReportSchedule> {
    const schedule = this.scheduleRepository.create({
      ...scheduleData,
      createdById: userId,
      nextRunAt: this.calculateNextRunDate(scheduleData.frequency),
    });

    return await this.scheduleRepository.save(schedule);
  }

  async updateSchedule(
    scheduleId: string,
    userId: string,
    updateData: Partial<ReportSchedule>,
  ): Promise<ReportSchedule> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id: scheduleId, createdById: userId },
    });

    if (!schedule) {
      throw new Error('Schedule not found');
    }

    Object.assign(schedule, updateData);

    if (updateData.frequency) {
      schedule.nextRunAt = this.calculateNextRunDate(updateData.frequency);
    }

    return await this.scheduleRepository.save(schedule);
  }

  async deleteSchedule(scheduleId: string, userId: string): Promise<void> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id: scheduleId, createdById: userId },
    });

    if (!schedule) {
      throw new Error('Schedule not found');
    }

    await this.scheduleRepository.remove(schedule);
  }

  async listSchedules(userId: string): Promise<ReportSchedule[]> {
    return await this.scheduleRepository.find({
      where: { createdById: userId },
      order: { createdAt: 'DESC' },
    });
  }

  private calculateNextRunDate(frequency: ScheduleFrequency): Date {
    const now = new Date();

    switch (frequency) {
      case ScheduleFrequency.DAILY:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case ScheduleFrequency.WEEKLY:
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case ScheduleFrequency.MONTHLY:
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        return nextMonth;
      case ScheduleFrequency.QUARTERLY:
        const nextQuarter = new Date(now);
        nextQuarter.setMonth(nextQuarter.getMonth() + 3);
        return nextQuarter;
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  }
}
