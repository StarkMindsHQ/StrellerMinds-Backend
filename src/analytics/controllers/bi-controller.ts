import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BusinessMetricsService } from '../services/business-metrics.service';
import { CustomDashboardService } from '../services/custom-dashboard.service';
import { AdvancedPredictiveService } from '../services/advanced-predictive.service';
import { AnalyticsReportingService } from '../services/analytics-reporting.service';

/**
 * Business Intelligence Controller
 * Provides comprehensive BI capabilities including metrics, dashboards, predictions, and reports
 */
@ApiTags('Business Intelligence')
@ApiBearerAuth()
@Controller('analytics/bi')
export class BIController {
  constructor(
    private readonly metricsService: BusinessMetricsService,
    private readonly dashboardService: CustomDashboardService,
    private readonly predictiveService: AdvancedPredictiveService,
    private readonly reportingService: AnalyticsReportingService,
  ) {}

  // ============================================================================
  // Business Metrics Endpoints
  // ============================================================================

  @Get('metrics')
  @ApiOperation({ summary: 'Get comprehensive business metrics' })
  @ApiResponse({ status: 200, description: 'Business metrics retrieved successfully' })
  async getBusinessMetrics(
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const metrics = await this.metricsService.getBusinessMetrics({
      from: from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      to: to || new Date().toISOString(),
    });

    return {
      success: true,
      data: metrics,
    };
  }

  @Get('metrics/kpi')
  @ApiOperation({ summary: 'Get KPI summary for executive dashboard' })
  @ApiResponse({ status: 200, description: 'KPI summary retrieved' })
  async getKPISummary() {
    const kpi = await this.metricsService.getKPISummary();

    return {
      success: true,
      data: kpi,
    };
  }

  @Get('metrics/cohorts')
  @ApiOperation({ summary: 'Get cohort analysis' })
  @ApiResponse({ status: 200, description: 'Cohort analysis retrieved' })
  async getCohortAnalysis(
    @Query('size') size: 'day' | 'week' | 'month' = 'week',
  ) {
    const analysis = await this.metricsService.getCohortAnalysis(size);

    return {
      success: true,
      data: analysis,
    };
  }

  @Post('metrics/funnel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get funnel analysis' })
  @ApiResponse({ status: 200, description: 'Funnel analysis retrieved' })
  async getFunnelAnalysis(@Body('steps') steps: string[]) {
    const analysis = await this.metricsService.getFunnelAnalysis(steps);

    return {
      success: true,
      data: analysis,
    };
  }

  // ============================================================================
  // Dashboard Endpoints
  // ============================================================================

  @Get('dashboards')
  @ApiOperation({ summary: 'Get all dashboards for current user' })
  @ApiResponse({ status: 200, description: 'Dashboards retrieved' })
  async getUserDashboards(@Query('userId') userId: string) {
    const dashboards = await this.dashboardService.getUserDashboards(userId);

    return {
      success: true,
      data: dashboards,
    };
  }

  @Get('dashboards/:id')
  @ApiOperation({ summary: 'Get dashboard by ID with data' })
  @ApiResponse({ status: 200, description: 'Dashboard retrieved' })
  async getDashboard(@Param('id') id: string, @Query('userId') userId: string) {
    const dashboard = await this.dashboardService.getDashboard(id, userId);

    return {
      success: true,
      data: dashboard,
    };
  }

  @Post('dashboards')
  @ApiOperation({ summary: 'Create new dashboard' })
  @ApiResponse({ status: 201, description: 'Dashboard created' })
  async createDashboard(
    @Query('userId') userId: string,
    @Body() config: any,
  ) {
    const dashboard = await this.dashboardService.createDashboard(userId, config);

    return {
      success: true,
      data: dashboard,
    };
  }

  @Post('dashboards/from-template')
  @ApiOperation({ summary: 'Create dashboard from template' })
  @ApiResponse({ status: 201, description: 'Dashboard created from template' })
  async createFromTemplate(
    @Query('userId') userId: string,
    @Body() body: { templateId: string; name: string },
  ) {
    const dashboard = await this.dashboardService.createFromTemplate(
      userId,
      body.templateId,
      body.name,
    );

    return {
      success: true,
      data: dashboard,
    };
  }

  @Get('dashboards/templates')
  @ApiOperation({ summary: 'Get available dashboard templates' })
  @ApiResponse({ status: 200, description: 'Templates retrieved' })
  getDashboardTemplates() {
    const templates = this.dashboardService.getDashboardTemplates();

    return {
      success: true,
      data: templates,
    };
  }

  @Post('dashboards/:id/refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh dashboard data' })
  @ApiResponse({ status: 200, description: 'Dashboard refreshed' })
  async refreshDashboard(@Param('id') id: string, @Query('userId') userId: string) {
    const dashboard = await this.dashboardService.refreshDashboard(id, userId);

    return {
      success: true,
      data: dashboard,
    };
  }

  // ============================================================================
  // Predictive Analytics Endpoints
  // ============================================================================

  @Post('predictions/churn')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Predict churn risk for users' })
  @ApiResponse({ status: 200, description: 'Churn predictions generated' })
  async predictChurn(@Body('userIds') userIds: string[]) {
    const predictions = await this.predictiveService.predictChurnRisk(userIds);

    return {
      success: true,
      data: predictions,
    };
  }

  @Post('predictions/completion')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Predict course completion probability' })
  @ApiResponse({ status: 200, description: 'Completion prediction generated' })
  async predictCompletion(
    @Body('userId') userId: string,
    @Body('courseId') courseId: string,
  ) {
    const prediction = await this.predictiveService.predictCompletion(userId, courseId);

    return {
      success: true,
      data: prediction,
    };
  }

  @Get('predictions/revenue')
  @ApiOperation({ summary: 'Get revenue predictions' })
  @ApiResponse({ status: 200, description: 'Revenue predictions generated' })
  async predictRevenue(@Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number) {
    const prediction = await this.predictiveService.predictRevenue(days);

    return {
      success: true,
      data: prediction,
    };
  }

  @Get('predictions/engagement')
  @ApiOperation({ summary: 'Get engagement trend predictions' })
  @ApiResponse({ status: 200, description: 'Engagement predictions generated' })
  async predictEngagement() {
    const prediction = await this.predictiveService.predictEngagementTrends();

    return {
      success: true,
      data: prediction,
    };
  }

  @Get('predictions/forecast/:metric')
  @ApiOperation({ summary: 'Forecast specific metric' })
  @ApiResponse({ status: 200, description: 'Forecast generated' })
  async forecastMetric(
    @Param('metric') metric: string,
    @Query('periods', new DefaultValuePipe(30), ParseIntPipe) periods: number,
  ) {
    const forecast = await this.predictiveService.forecastMetrics(metric, periods);

    return {
      success: true,
      data: forecast,
    };
  }

  @Get('predictions/anomalies/:metric')
  @ApiOperation({ summary: 'Detect anomalies in metric' })
  @ApiResponse({ status: 200, description: 'Anomaly detection complete' })
  async detectAnomalies(
    @Param('metric') metric: string,
    @Query('threshold', new DefaultValuePipe(2), ParseIntPipe) threshold: number,
  ) {
    const result = await this.predictiveService.detectAnomalies(metric, threshold);

    return {
      success: true,
      data: result,
    };
  }

  @Get('predictions/segments')
  @ApiOperation({ summary: 'Get user segmentation analysis' })
  @ApiResponse({ status: 200, description: 'User segments retrieved' })
  async getUserSegments() {
    const segments = await this.predictiveService.segmentUsers();

    return {
      success: true,
      data: segments,
    };
  }

  @Get('predictions/recommendations/:userId')
  @ApiOperation({ summary: 'Get personalized recommendations for user' })
  @ApiResponse({ status: 200, description: 'Recommendations generated' })
  async getRecommendations(@Param('userId') userId: string) {
    const recommendations = await this.predictiveService.getPersonalizedRecommendations(userId);

    return {
      success: true,
      data: recommendations,
    };
  }

  // ============================================================================
  // Reporting Endpoints
  // ============================================================================

  @Get('reports/templates')
  @ApiOperation({ summary: 'Get available report templates' })
  @ApiResponse({ status: 200, description: 'Report templates retrieved' })
  getReportTemplates() {
    const templates = this.reportingService.getReportTemplates();

    return {
      success: true,
      data: templates,
    };
  }

  @Post('reports/executive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate executive summary report' })
  @ApiResponse({ status: 200, description: 'Executive report generated' })
  async generateExecutiveReport(
    @Body('from') from: string,
    @Body('to') to: string,
  ) {
    const report = await this.reportingService.generateExecutiveReport({
      from: from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      to: to || new Date().toISOString(),
    });

    return {
      success: true,
      data: report,
    };
  }

  @Post('reports/detailed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate detailed analytics report' })
  @ApiResponse({ status: 200, description: 'Detailed report generated' })
  async generateDetailedReport(
    @Body('from') from: string,
    @Body('to') to: string,
    @Body('sections') sections: any[],
  ) {
    const report = await this.reportingService.generateDetailedReport(
      {
        from: from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        to: to || new Date().toISOString(),
      },
      sections,
    );

    return {
      success: true,
      data: report,
    };
  }

  @Post('reports/comparison')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate comparison report between two periods' })
  @ApiResponse({ status: 200, description: 'Comparison report generated' })
  async generateComparisonReport(@Body() body: any) {
    const report = await this.reportingService.generateComparisonReport(
      body.period1,
      body.period2,
      body.metrics,
    );

    return {
      success: true,
      data: report,
    };
  }

  @Post('reports/cohort')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate cohort analysis report' })
  @ApiResponse({ status: 200, description: 'Cohort report generated' })
  async generateCohortReport(
    @Body('cohortSize') cohortSize: 'day' | 'week' | 'month' = 'week',
  ) {
    const report = await this.reportingService.generateCohortReport(cohortSize);

    return {
      success: true,
      data: report,
    };
  }

  @Post('reports/funnel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate funnel analysis report' })
  @ApiResponse({ status: 200, description: 'Funnel report generated' })
  async generateFunnelReport(@Body('steps') steps: string[]) {
    const report = await this.reportingService.generateFunnelReport(steps);

    return {
      success: true,
      data: report,
    };
  }

  @Post('reports/schedule')
  @ApiOperation({ summary: 'Schedule a recurring report' })
  @ApiResponse({ status: 201, description: 'Report scheduled' })
  async scheduleReport(@Body() config: any) {
    const schedule = await this.reportingService.scheduleReport(config);

    return {
      success: true,
      data: schedule,
    };
  }

  @Get('reports/:id/export')
  @ApiOperation({ summary: 'Export report in specified format' })
  @ApiResponse({ status: 200, description: 'Report export initiated' })
  async exportReport(
    @Param('id') id: string,
    @Query('format') format: 'pdf' | 'excel' | 'csv' | 'json' = 'pdf',
  ) {
    const exportInfo = await this.reportingService.exportReport(id, format);

    return {
      success: true,
      data: exportInfo,
    };
  }
}
