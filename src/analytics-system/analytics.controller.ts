import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Param,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AnalyticsService } from './analytics.service';
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
import { CourseCompletionPrediction } from './entities/course-completion-prediction.entity';
import { ReportGenerationJob } from './entities/report-generation-job.entity';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'instructor') // Only admins and instructors can access analytics
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('course-performance')
  @ApiOperation({ summary: 'Get performance metrics for a specific course' })
  @ApiResponse({ status: 200, type: Object, description: 'Course performance metrics' })
  async getCoursePerformance(@Query() query: AnalyticsQueryDto): Promise<CoursePerformanceMetrics> {
    if (!query.courseId) {
      throw new BadRequestException('Course ID is required.');
    }
    return this.analyticsService.getCoursePerformance(query);
  }

  @Get('user-engagement')
  @ApiOperation({ summary: 'Get engagement metrics for a specific user' })
  @ApiResponse({ status: 200, type: Object, description: 'User engagement metrics' })
  async getUserEngagement(@Query() query: AnalyticsQueryDto): Promise<UserEngagementMetrics> {
    if (!query.userId) {
      throw new BadRequestException('User ID is required.');
    }
    return this.analyticsService.getUserEngagement(query);
  }

  @Get('instructor-performance')
  @ApiOperation({ summary: 'Get performance metrics for a specific instructor' })
  @ApiResponse({ status: 200, type: Object, description: 'Instructor performance metrics' })
  async getInstructorPerformance(
    @Query() query: AnalyticsQueryDto,
  ): Promise<InstructorPerformanceMetrics> {
    if (!query.instructorId) {
      throw new BadRequestException('Instructor ID is required.');
    }
    return this.analyticsService.getInstructorPerformance(query);
  }

  @Get('platform-overview')
  @ApiOperation({ summary: 'Get overall platform analytics overview' })
  @ApiResponse({ status: 200, type: Object, description: 'Platform overview metrics' })
  async getPlatformOverview(@Query() query: AnalyticsQueryDto): Promise<any> {
    return this.analyticsService.getPlatformOverview(query);
  }

  @Get('realtime')
  @ApiOperation({ summary: 'Get real-time analytics dashboard data' })
  @ApiResponse({ status: 200, type: Object, description: 'Real-time dashboard data' })
  async getRealtimeData(): Promise<RealtimeDashboardData> {
    return this.analyticsService.getRealtimeData();
  }

  @Post('predict-completion')
  @ApiOperation({ summary: 'Predict course completion likelihood for a user' })
  @ApiResponse({ status: 200, type: Object, description: 'Prediction result and recommendations' })
  async predictCompletion(@Body() dto: PredictCompletionDto): Promise<PredictiveAnalyticsResult> {
    return this.analyticsService.predictCompletion(dto);
  }

  @Get('predictions/user/:userId')
  @ApiOperation({ summary: 'Get all course completion predictions for a specific user' })
  @ApiResponse({
    status: 200,
    type: [CourseCompletionPrediction],
    description: 'List of predictions',
  })
  async getUserPredictions(@Param('userId') userId: string): Promise<CourseCompletionPrediction[]> {
    return this.analyticsService.getUserPredictions(userId);
  }

  @Get('predictions/course/:courseId')
  @ApiOperation({ summary: 'Get all course completion predictions for a specific course' })
  @ApiResponse({
    status: 200,
    type: [CourseCompletionPrediction],
    description: 'List of predictions',
  })
  async getCoursePredictions(
    @Param('courseId') courseId: string,
  ): Promise<CourseCompletionPrediction[]> {
    return this.analyticsService.getCoursePredictions(courseId);
  }

  @Get('predictive-summary')
  @ApiOperation({ summary: 'Get a summary of predictive analytics' })
  @ApiResponse({ status: 200, type: Object, description: 'Summary of predictive analytics' })
  async getPredictiveSummary(@Query() query: AnalyticsQueryDto): Promise<any> {
    return this.analyticsService.getPredictiveSummary(query);
  }

  @Post('reports/generate')
  @ApiOperation({ summary: 'Generate a comprehensive report' })
  @ApiResponse({ status: 202, type: Object, description: 'Report generation job initiated' })
  async generateReport(
    @Body() dto: GenerateReportDto,
    @Req() req: Request,
  ): Promise<GeneratedReport> {
    const userId = req.user['id'];
    return this.analyticsService.generateReport(dto, userId);
  }

  @Get('reports/status/:jobId')
  @ApiOperation({ summary: 'Get the status of a report generation job' })
  @ApiResponse({ status: 200, type: ReportGenerationJob, description: 'Report job status' })
  async getReportStatus(@Param('jobId') jobId: string): Promise<ReportGenerationJob | null> {
    return this.analyticsService.getReportStatus(jobId);
  }

  @Get('reports/download/:filename')
  @ApiOperation({ summary: 'Download a generated report file' })
  @ApiResponse({ status: 200, description: 'Report file' })
  // Note: In a real application, this endpoint would serve the file,
  // potentially with authentication and authorization checks.
  // For Next.js, this is a placeholder.
  async downloadReport(@Param('filename') filename: string) {
    return { message: `Download link for ${filename} would be provided here.` };
  }
}
