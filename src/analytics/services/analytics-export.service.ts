import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { createObjectCsvStringifier } from 'csv-writer';

import { EngagementEvent } from '../entities/engagement-event.entity';
import { AtRiskPrediction } from '../entities/at-risk-prediction.entity';
import { ExportAnalyticsDto } from '../dto/analytics.dto';
import { StudentProgress } from '../entities/student.progress.entity';
import { CourseAnalyticsService } from './course-analytics.service';

export interface ExportResult {
  data: string | Buffer;
  filename: string;
  mimeType: string;
}

@Injectable()
export class AnalyticsExportService {
  private readonly logger = new Logger(AnalyticsExportService.name);

  constructor(
    @InjectRepository(StudentProgress)
    private progressRepo: Repository<StudentProgress>,

    @InjectRepository(EngagementEvent)
    private engagementRepo: Repository<EngagementEvent>,

    @InjectRepository(AtRiskPrediction)
    private atRiskRepo: Repository<AtRiskPrediction>,

    private courseAnalyticsService: CourseAnalyticsService,
  ) {}

  async export(dto: ExportAnalyticsDto): Promise<ExportResult> {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);

    switch (dto.reportType) {
      case 'progress':
        return this.exportProgress(dto, start, end);
      case 'engagement':
        return this.exportEngagement(dto, start, end);
      case 'at_risk':
        return this.exportAtRisk(dto);
      case 'instructor_summary':
        return this.exportInstructorSummary(dto, start, end);
      default:
        throw new BadRequestException(`Unknown report type: ${dto.reportType}`);
    }
  }

  private async exportProgress(
    dto: ExportAnalyticsDto,
    start: Date,
    end: Date,
  ): Promise<ExportResult> {
    const where: any = { updatedAt: Between(start, end) };
    if (dto.courseId) where.courseId = dto.courseId;
    if (dto.userId) where.userId = dto.userId;

    const rows = await this.progressRepo.find({ where, order: { updatedAt: 'DESC' } });

    const records = rows.map((r) => ({
      userId: r.userId,
      courseId: r.courseId,
      status: r.status,
      completionPercentage: r.completionPercentage,
      timeSpentHours: (r.timeSpentSeconds / 3600).toFixed(2),
      lessonsCompleted: r.lessonsCompleted,
      totalLessons: r.totalLessons,
      averageQuizScore: r.averageQuizScore ?? '',
      quizAttempts: r.quizAttempts,
      streakDays: r.streakDays,
      startedAt: r.startedAt?.toISOString() ?? '',
      completedAt: r.completedAt?.toISOString() ?? '',
      lastActivityAt: r.lastActivityAt?.toISOString() ?? '',
    }));

    return this.formatOutput(records, dto.format, `progress_${dto.courseId ?? 'all'}`);
  }

  private async exportEngagement(
    dto: ExportAnalyticsDto,
    start: Date,
    end: Date,
  ): Promise<ExportResult> {
    const where: any = { createdAt: Between(start, end) };
    if (dto.courseId) where.courseId = dto.courseId;
    if (dto.userId) where.userId = dto.userId;

    const rows = await this.engagementRepo.find({
      where,
      order: { createdAt: 'DESC' },
      take: 50_000, // safety cap
    });

    const records = rows.map((r) => ({
      userId: r.userId,
      courseId: r.courseId ?? '',
      lessonId: r.lessonId ?? '',
      eventType: r.eventType,
      durationSeconds: r.durationSeconds,
      deviceType: r.deviceType ?? '',
      sessionId: r.sessionId ?? '',
      createdAt: r.createdAt.toISOString(),
    }));

    return this.formatOutput(records, dto.format, `engagement_${dto.courseId ?? 'all'}`);
  }

  private async exportAtRisk(dto: ExportAnalyticsDto): Promise<ExportResult> {
    const where: any = { resolved: false };
    if (dto.courseId) where.courseId = dto.courseId;
    if (dto.userId) where.userId = dto.userId;

    const rows = await this.atRiskRepo.find({ where, order: { riskScore: 'DESC' } });

    const records = rows.map((r) => ({
      userId: r.userId,
      courseId: r.courseId,
      riskLevel: r.riskLevel,
      riskScore: r.riskScore,
      inactivityDays: r.riskFactors?.inactivityDays ?? '',
      lowEngagement: r.riskFactors?.lowEngagement ? 'Yes' : 'No',
      decliningScores: r.riskFactors?.decliningScores ? 'Yes' : 'No',
      failedQuizzes: r.riskFactors?.failedQuizzes ?? 0,
      recommendations: (r.recommendedInterventions ?? []).join('; '),
      instructorNotified: r.instructorNotified ? 'Yes' : 'No',
      createdAt: r.createdAt.toISOString(),
    }));

    return this.formatOutput(records, dto.format, `at_risk_${dto.courseId ?? 'all'}`);
  }

  private async exportInstructorSummary(
    dto: ExportAnalyticsDto,
    start: Date,
    end: Date,
  ): Promise<ExportResult> {
    if (!dto.courseId) throw new BadRequestException('courseId required for instructor_summary');

    const analytics = await this.courseAnalyticsService.getCourseAnalytics(
      dto.courseId,
      start,
      end,
    );

    const records = [
      { metric: 'Total Enrolled', value: analytics.totalEnrolled },
      { metric: 'Active Students', value: analytics.activeStudents },
      { metric: 'Completion Rate (%)', value: analytics.completionRate },
      { metric: 'Average Progress (%)', value: analytics.averageProgress },
      { metric: 'Average Time Spent (hrs)', value: analytics.averageTimeSpentHours },
      { metric: 'Average Quiz Score', value: analytics.averageQuizScore },
      { metric: 'Dropout Rate (%)', value: analytics.dropoutRate },
      { metric: 'At-Risk Count', value: analytics.atRiskCount },
      { metric: 'Engagement Score', value: analytics.engagementScore },
    ];

    return this.formatOutput(records, dto.format, `instructor_summary_${dto.courseId}`);
  }

  private formatOutput(
    records: Record<string, any>[],
    format: 'csv' | 'json' | 'xlsx' | 'pdf',
    basename: string,
  ): ExportResult {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${basename}_${timestamp}.${format}`;

    if (format === 'json') {
      return {
        data: JSON.stringify(records, null, 2),
        filename,
        mimeType: 'application/json',
      };
    }

    if (format === 'pdf') {
      const content = records
        .map((row) =>
          Object.entries(row)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n'),
        )
        .join('\n\n');

      return {
        data: Buffer.from(content, 'utf-8'),
        filename: filename.replace('.pdf', '.pdf'),
        mimeType: 'application/pdf',
      };
    }

    if (format === 'csv') {
      if (!records.length) return { data: '', filename, mimeType: 'text/csv' };

      const headers = Object.keys(records[0]).map((key) => ({ id: key, title: key }));
      const csvStringifier = createObjectCsvStringifier({ header: headers });
      const csv = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);

      return { data: csv, filename, mimeType: 'text/csv' };
    }

    if (format === 'xlsx') {
      // Requires exceljs — build a simple TSV as fallback if not installed
      // Replace with: const wb = new ExcelJS.Workbook(); etc.
      const tsvRows = [
        Object.keys(records[0] ?? {}).join('\t'),
        ...records.map((r) => Object.values(r).join('\t')),
      ].join('\n');

      return {
        data: Buffer.from(tsvRows, 'utf-8'),
        filename: filename.replace('.xlsx', '.tsv'),
        mimeType: 'text/tab-separated-values',
      };
    }

    throw new BadRequestException(`Unsupported format: ${format}`);
  }

  async exportReport(
    data: Record<string, any>,
    format: 'csv' | 'json' | 'xlsx' | 'pdf',
  ): Promise<{ data: string | Buffer; mimeType: string; extension: string }> {
    const records = Array.isArray(data) ? data : [data];
    const result = this.formatOutput(records, format, 'report');
    const extension = format === 'xlsx' ? 'tsv' : format;
    return { data: result.data, mimeType: result.mimeType, extension };
  }
}
