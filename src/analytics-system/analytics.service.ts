import { Injectable, Logger } from '@nestjs/common';
import type { AnalyticsQueryDto } from './dto/analytics-query.dto';
import type { PredictCompletionDto } from './dto/predict-completion.dto';
import type { GenerateReportDto } from './dto/generate-report.dto';
import type {
  CoursePerformanceMetrics,
  UserEngagementMetrics,
  InstructorPerformanceMetrics,
  PredictiveAnalyticsResult,
  RealtimeDashboardData,
  GeneratedReport,
} from './interfaces/analytics.interface';
import type { AnalyticsDataService } from './services/analytics-data.service';
import type { RealtimeAnalyticsService } from './services/realtime-analytics.service';
import type { PredictiveAnalyticsService } from './services/predictive-analytics.service';
import type { ReportingService } from './services/reporting.service';
import type { ReportGenerationJob } from './entities/report-generation-job.entity';
import type { Repository } from 'typeorm';
import type { CourseCompletionPrediction } from './entities/course-completion-prediction.entity';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly analyticsDataService: AnalyticsDataService,
    private readonly realtimeAnalyticsService: RealtimeAnalyticsService,
    private readonly predictiveAnalyticsService: PredictiveAnalyticsService,
    private readonly reportingService: ReportingService,
    private readonly courseCompletionPredictionRepository: Repository<CourseCompletionPrediction>,
  ) {}

  async getCoursePerformance(dto: AnalyticsQueryDto): Promise<CoursePerformanceMetrics> {
    const startDate = dto.startDate ? new Date(dto.startDate) : undefined;
    const endDate = dto.endDate ? new Date(dto.endDate) : undefined;
    if (!dto.courseId) {
      throw new Error('Course ID is required for course performance analytics.');
    }
    return this.reportingService.getCoursePerformanceMetrics(dto.courseId, startDate, endDate);
  }

  async getUserEngagement(dto: AnalyticsQueryDto): Promise<UserEngagementMetrics> {
    const startDate = dto.startDate ? new Date(dto.startDate) : undefined;
    const endDate = dto.endDate ? new Date(dto.endDate) : undefined;
    if (!dto.userId) {
      throw new Error('User ID is required for user engagement analytics.');
    }
    return this.reportingService.getUserEngagementMetrics(dto.userId, startDate, endDate);
  }

  async getInstructorPerformance(dto: AnalyticsQueryDto): Promise<InstructorPerformanceMetrics> {
    const startDate = dto.startDate ? new Date(dto.startDate) : undefined;
    const endDate = dto.endDate ? new Date(dto.endDate) : undefined;
    if (!dto.instructorId) {
      throw new Error('Instructor ID is required for instructor performance analytics.');
    }
    return this.reportingService.getInstructorPerformanceMetrics(
      dto.instructorId,
      startDate,
      endDate,
    );
  }

  async getPlatformOverview(dto: AnalyticsQueryDto): Promise<any> {
    const startDate = dto.startDate ? new Date(dto.startDate) : undefined;
    const endDate = dto.endDate ? new Date(dto.endDate) : undefined;
    return this.reportingService['getPlatformOverviewMetrics'](startDate, endDate); // Access private method for now
  }

  async getRealtimeData(): Promise<RealtimeDashboardData> {
    return this.realtimeAnalyticsService.getRealtimeDashboardData();
  }

  async predictCompletion(dto: PredictCompletionDto): Promise<PredictiveAnalyticsResult> {
    return this.predictiveAnalyticsService.predictCourseCompletion(dto);
  }

  async getUserPredictions(userId: string): Promise<CourseCompletionPrediction[]> {
    return this.predictiveAnalyticsService.getUserCompletionPredictions(userId);
  }

  async getCoursePredictions(courseId: string): Promise<CourseCompletionPrediction[]> {
    return this.predictiveAnalyticsService.getCourseCompletionPredictions(courseId);
  }

  async generateReport(dto: GenerateReportDto, userId: string): Promise<GeneratedReport> {
    const { jobId, status } = await this.reportingService.generateReport(dto, userId);
    return { jobId, status };
  }

  async getReportStatus(jobId: string): Promise<ReportGenerationJob | null> {
    return this.reportingService.getReportJobStatus(jobId);
  }

  async getPredictiveSummary(dto: AnalyticsQueryDto): Promise<any> {
    const startDate = dto.startDate ? new Date(dto.startDate) : undefined;
    const endDate = dto.endDate ? new Date(dto.endDate) : undefined;
    const summary = await this.reportingService['getPredictiveSummary'](startDate, endDate);
    return summary[0]; // It returns an array, but we want the single summary object
  }
}
