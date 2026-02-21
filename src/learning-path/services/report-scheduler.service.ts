import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportSchedule } from '../entities/report-schedule.entity';
import { ScheduleReportDto } from '../dto/schedule-report.dto';
import { ReportTemplate } from '../entities/report-template.entity';

@Injectable()
export class ReportSchedulerService {
  constructor(
    @InjectRepository(ReportSchedule)
    private scheduleRepository: Repository<ReportSchedule>,
  ) {}

  async createSchedule(dto: ScheduleReportDto, template: ReportTemplate): Promise<ReportSchedule> {
    const schedule = this.scheduleRepository.create({
      ...dto,
      template,
      nextRun: this.calculateNextRun(dto.frequency),
    });
    return this.scheduleRepository.save(schedule);
  }

  async getSchedules(templateId: string): Promise<ReportSchedule[]> {
    return this.scheduleRepository.find({ where: { template: { id: templateId } } });
  }

  private calculateNextRun(frequency: string): Date {
    const now = new Date();
    if (frequency === 'DAILY') {
      now.setDate(now.getDate() + 1);
    } else if (frequency === 'WEEKLY') {
      now.setDate(now.getDate() + 7);
    } else if (frequency === 'MONTHLY') {
      now.setMonth(now.getMonth() + 1);
    }
    now.setHours(0, 0, 0, 0);
    return now;
  }

  // A cron job would call a method here to check for due schedules and trigger generation
}