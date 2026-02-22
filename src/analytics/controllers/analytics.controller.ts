import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Res,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/auth.guard';

// Your existing report-based service
import { AnalyticsService } from '../services/analytics.service';
// New course/student analytics service — distinct name, no collision
import { CourseAnalyticsService } from '../services/course-analytics.service';
import { AnalyticsExportService } from '../services/analytics-export.service';
import { ExportReportDto, ExportAnalyticsDto } from '../dto/analytics.dto';
import { ProgressTrackingService } from '../../learning-path/services/progress-tracking.service';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(
    // Existing report service — keep exactly as-is
    private readonly analyticsService: AnalyticsService,
    // New course/student/instructor analytics
    private readonly courseAnalyticsService: CourseAnalyticsService,
    private readonly exportService: AnalyticsExportService,
    private readonly progressService: ProgressTrackingService,
  ) {}

  // ─── Existing report endpoints (your AnalyticsService) ───────────────────

  @Get('reports')
  @ApiOperation({ summary: 'List all reports' })
  @ApiResponse({ status: 200 })
  async listReports(@Request() req, @Query() filters?: any) {
    const reports = await this.analyticsService.listReports(req.user.id, filters);
    return { success: true, data: reports };
  }

  @Get('reports/:reportId')
  @ApiOperation({ summary: 'Get report by ID' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  async getReport(@Request() req, @Param('reportId') reportId: string) {
    const report = await this.analyticsService.getReportById(reportId, req.user.id);
    return { success: true, data: report };
  }

  @Post('reports/:reportId/generate')
  @ApiOperation({ summary: 'Generate report data' })
  @HttpCode(HttpStatus.OK)
  async generateReport(@Param('reportId') reportId: string) {
    const report = await this.analyticsService.generateReport(reportId);
    return { success: true, data: report };
  }

  @Post('reports/:reportId/export')
  @ApiOperation({ summary: 'Export report in specified format' })
  async exportReport(
    @Request() req,
    @Param('reportId') reportId: string,
    @Body() exportDto: ExportReportDto,
    @Res() res: Response,
  ) {
    const report = await this.analyticsService.getReportById(reportId, req.user.id);
    const { data, mimeType, extension } = await this.exportService.exportReport(
      report.data,
      exportDto.format,
    );

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="report-${report.id}.${extension}"`);
    res.send(data);
  }

  @Delete('reports/:reportId')
  @ApiOperation({ summary: 'Delete report' })
  @HttpCode(HttpStatus.OK)
  async deleteReport(@Request() req, @Param('reportId') reportId: string) {
    await this.analyticsService.deleteReport(reportId, req.user.id);
    return { success: true, message: 'Report deleted successfully' };
  }

  @Get('overview')
  @ApiOperation({ summary: 'Get analytics dashboard overview' })
  async getDashboardOverview(@Request() req, @Query() query?: any) {
    const dateRange =
      query.startDate && query.endDate
        ? { start: new Date(query.startDate), end: new Date(query.endDate) }
        : undefined;

    const overview = await this.analyticsService.getDashboardOverview(req.user.id, dateRange);
    return { success: true, data: overview };
  }

  // ─── New course/student/instructor endpoints (CourseAnalyticsService) ─────

  @Get('courses/:courseId')
  @ApiOperation({ summary: 'Full analytics for a course' })
  async getCourseAnalytics(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const data = await this.courseAnalyticsService.getCourseAnalytics(
      courseId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
    return { success: true, data };
  }

  @Get('students/:userId')
  @ApiOperation({ summary: 'Full analytics for a student' })
  async getStudentAnalytics(@Param('userId', ParseUUIDPipe) userId: string) {
    const data = await this.courseAnalyticsService.getStudentAnalytics(userId);
    return { success: true, data };
  }

  @Get('instructor/:instructorId')
  @ApiOperation({ summary: 'Instructor dashboard' })
  async getInstructorDashboard(
    @Param('instructorId', ParseUUIDPipe) instructorId: string,
    @Query('courseIds') courseIdsParam?: string,
  ) {
    const courseIds = courseIdsParam ? courseIdsParam.split(',').filter(Boolean) : [];
    const data = await this.courseAnalyticsService.getInstructorDashboard(instructorId, courseIds);
    return { success: true, data };
  }

  @Get('progress/user/:userId')
  @ApiOperation({ summary: 'Progress records for a user' })
  async getUserProgress(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('courseId') courseId?: string,
  ) {
    const data = await this.progressService.getUserProgress(userId, courseId);
    return { success: true, data };
  }

  @Get('at-risk/course/:courseId')
  @ApiOperation({ summary: 'At-risk students for a course' })
  async getAtRiskStudents(@Param('courseId', ParseUUIDPipe) courseId: string) {
    const data = await this.progressService['atRiskRepo'].find({
      where: { courseId, resolved: false },
      order: { riskScore: 'DESC' },
    });
    return { success: true, data };
  }

  @Post('export')
  @ApiOperation({ summary: 'Export analytics data as CSV/JSON/XLSX' })
  async exportAnalytics(@Body() dto: ExportAnalyticsDto, @Res() res: Response) {
    const result = await this.exportService.export(dto);
    res.set({
      'Content-Type': result.mimeType,
      'Content-Disposition': `attachment; filename="${result.filename}"`,
    });
    res.send(result.data);
  }
}
