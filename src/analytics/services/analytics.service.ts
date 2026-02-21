import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { AnalyticsReport, ReportStatus } from '../entities/analytics-report.entity';
import { DataAggregationService } from './data-aggregation.service';
import { VisualizationService } from './visualization.service';
import { PredictiveAnalyticsService } from './predictive-analytics.service';
import { CourseAnalyticsService } from './course-analytics.service';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(AnalyticsReport)
    private reportRepository: Repository<AnalyticsReport>,
    private dataAggregationService: DataAggregationService,
    private visualizationService: VisualizationService,
    private predictiveAnalyticsService: PredictiveAnalyticsService,
    private readonly analyticsService: AnalyticsService,
    private readonly courseAnalyticsService: CourseAnalyticsService,
  ) {}

  async getReportById(reportId: string, userId: string): Promise<AnalyticsReport> {
    const report = await this.reportRepository.findOne({
      where: { id: reportId, createdById: userId },
      relations: ['createdBy'],
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    return report;
  }

  async listReports(userId: string, filters?: any): Promise<AnalyticsReport[]> {
    const query = this.reportRepository
      .createQueryBuilder('report')
      .where('report.createdById = :userId', { userId })
      .orderBy('report.createdAt', 'DESC');

    if (filters?.reportType) {
      query.andWhere('report.reportType = :reportType', { reportType: filters.reportType });
    }

    if (filters?.status) {
      query.andWhere('report.status = :status', { status: filters.status });
    }

    return query.getMany();
  }

  async generateReport(reportId: string): Promise<AnalyticsReport> {
    const report = await this.reportRepository.findOne({ where: { id: reportId } });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    try {
      report.status = ReportStatus.PROCESSING;
      await this.reportRepository.save(report);

      const aggregatedData = await this.dataAggregationService.aggregateData(
        report.reportType,
        report.configuration,
      );

      const visualizations = await this.visualizationService.generateVisualizations(
        aggregatedData,
        report.configuration,
      );

      const insights = await this.predictiveAnalyticsService.generateInsights(
        aggregatedData,
        report.reportType,
      );

      report.data = aggregatedData;
      report.visualizations = visualizations;
      report.insights = insights;
      report.status = ReportStatus.COMPLETED;
      report.completedAt = new Date();

      return await this.reportRepository.save(report);
    } catch (error) {
      report.status = ReportStatus.FAILED;
      report.errorMessage = error.message;
      await this.reportRepository.save(report);
      throw error;
    }
  }

  async deleteReport(reportId: string, userId: string): Promise<void> {
    const report = await this.getReportById(reportId, userId);
    await this.reportRepository.remove(report);
  }

  async getDashboardOverview(userId: string, dateRange?: { start: Date; end: Date }) {
    const where: any = { createdById: userId };

    if (dateRange) {
      where.createdAt = Between(dateRange.start, dateRange.end);
    }

    const [totalReports, completedReports, failedReports] = await Promise.all([
      this.reportRepository.count({ where }),
      this.reportRepository.count({ where: { ...where, status: ReportStatus.COMPLETED } }),
      this.reportRepository.count({ where: { ...where, status: ReportStatus.FAILED } }),
    ]);

    return {
      totalReports,
      completedReports,
      failedReports,
      pendingReports: totalReports - completedReports - failedReports,
    };
  }
}
