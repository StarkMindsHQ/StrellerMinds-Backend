import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalyticsReport, ReportType, ReportStatus } from '../entities/analytics-report.entity';
import { CreateReportDto } from '../dto/analytics.dto';

@Injectable()
export class ReportBuilderService {
  constructor(
    @InjectRepository(AnalyticsReport)
    private reportRepository: Repository<AnalyticsReport>,
  ) {}

  async createReport(userId: string, createReportDto: CreateReportDto): Promise<AnalyticsReport> {
    const report = this.reportRepository.create({
      ...createReportDto,
      createdById: userId,
      status: ReportStatus.PENDING,
    });

    return await this.reportRepository.save(report);
  }

  async updateReport(
    reportId: string,
    userId: string,
    updateData: Partial<CreateReportDto>,
  ): Promise<AnalyticsReport> {
    const report = await this.reportRepository.findOne({
      where: { id: reportId, createdById: userId },
    });

    if (!report) {
      throw new Error('Report not found');
    }

    Object.assign(report, updateData);
    return await this.reportRepository.save(report);
  }

  async cloneReport(reportId: string, userId: string): Promise<AnalyticsReport> {
    const originalReport = await this.reportRepository.findOne({
      where: { id: reportId, createdById: userId },
    });

    if (!originalReport) {
      throw new Error('Report not found');
    }

    const clonedReport = this.reportRepository.create({
      name: `${originalReport.name} (Copy)`,
      description: originalReport.description,
      reportType: originalReport.reportType,
      configuration: originalReport.configuration,
      createdById: userId,
      status: ReportStatus.PENDING,
    });

    return await this.reportRepository.save(clonedReport);
  }

  getAvailableMetrics(reportType: ReportType): string[] {
    const metricsMap: Record<ReportType, string[]> = {
      [ReportType.USER_ENGAGEMENT]: [
        'totalUsers',
        'activeUsers',
        'engagementRate',
        'totalActivities',
        'profileViews',
        'sessionDuration',
        'bounceRate',
      ],
      [ReportType.FINANCIAL]: [
        'totalRevenue',
        'netRevenue',
        'totalRefunds',
        'transactionCount',
        'avgTransactionValue',
        'revenueGrowth',
      ],
      [ReportType.COURSE_PERFORMANCE]: [
        'totalEnrollments',
        'completionRate',
        'avgRating',
        'totalCourses',
        'activeStudents',
      ],
      [ReportType.SYSTEM_HEALTH]: [
        'totalRequests',
        'errorRate',
        'avgResponseTime',
        'uptime',
        'activeConnections',
      ],
      [ReportType.CUSTOM]: [],
    };

    return metricsMap[reportType] || [];
  }

  getAvailableDimensions(reportType: ReportType): string[] {
    const dimensionsMap: Record<ReportType, string[]> = {
      [ReportType.USER_ENGAGEMENT]: [
        'date',
        'activityType',
        'userRole',
        'deviceType',
        'location',
      ],
      [ReportType.FINANCIAL]: [
        'date',
        'paymentGateway',
        'paymentStatus',
        'currency',
        'plan',
      ],
      [ReportType.COURSE_PERFORMANCE]: [
        'date',
        'courseCategory',
        'instructor',
        'difficulty',
      ],
      [ReportType.SYSTEM_HEALTH]: [
        'date',
        'endpoint',
        'errorType',
        'statusCode',
      ],
      [ReportType.CUSTOM]: [],
    };

    return dimensionsMap[reportType] || [];
  }

  validateConfiguration(reportType: ReportType, configuration: any): boolean {
    const availableMetrics = this.getAvailableMetrics(reportType);
    const availableDimensions = this.getAvailableDimensions(reportType);

    const invalidMetrics = configuration.metrics.filter(
      (m: string) => !availableMetrics.includes(m),
    );
    const invalidDimensions = configuration.dimensions.filter(
      (d: string) => !availableDimensions.includes(d),
    );

    if (invalidMetrics.length > 0 || invalidDimensions.length > 0) {
      return false;
    }

    return true;
  }
}
