import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/auth.guard';
import { ApmService } from '../services/apm.service';
import { DatabaseOptimizationService } from '../services/database-optimization.service';
import { CacheOptimizationService } from '../services/cache-optimization.service';
import { PerformanceTuningService } from '../services/performance-tuning.service';
import { PerformanceAnalyticsService } from '../services/performance-analytics.service';
import { LoadTestingService, LoadTestConfig } from '../services/load-testing.service';
import { OptimizationRecommendationsService } from '../services/optimization-recommendations.service';
import { RealTimeMonitoringService } from '../services/real-time-monitoring.service';
import { DistributedTracingService } from '../services/distributed-tracing.service';
import { PerformanceProfilerService } from '../services/performance-profiler.service';
import { AlertingService, AlertType, AlertSeverity } from '../services/alerting.service';
import { PerformanceQueryDto, PerformanceReportDto } from '../dto/performance.dto';

@ApiTags('Performance Monitoring')
@Controller('monitoring')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MonitoringController {
  constructor(
    private apmService: ApmService,
    private databaseOptimization: DatabaseOptimizationService,
    private cacheOptimization: CacheOptimizationService,
    private performanceTuning: PerformanceTuningService,
    private analyticsService: PerformanceAnalyticsService,
    private loadTesting: LoadTestingService,
    private recommendationsService: OptimizationRecommendationsService,
    private realTimeService: RealTimeMonitoringService,
    private tracingService: DistributedTracingService,
    private profilerService: PerformanceProfilerService,
    private alertingService: AlertingService,
    private tracingService: DistributedTracingService,
    private profilerService: PerformanceProfilerService,
    private alertingService: AlertingService,
  ) {}

  // ===== Distributed Tracing Endpoints =====

  @Get('tracing/active-spans')
  @ApiOperation({ summary: 'Get active distributed traces' })
  @ApiResponse({ status: 200, description: 'Active spans retrieved' })
  getActiveSpans() {
    return this.tracingService.getActiveSpans();
  }

  @Get('tracing/spans/:traceId')
  @ApiOperation({ summary: 'Get spans for a trace' })
  @ApiResponse({ status: 200, description: 'Trace spans retrieved' })
  getTraceSpans(@Param('traceId') traceId: string) {
    return this.tracingService.getTraceSpans(traceId);
  }

  @Get('tracing/completed')
  @ApiOperation({ summary: 'Get completed spans' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Completed spans retrieved' })
  getCompletedSpans(@Query('limit') limit?: number) {
    return this.tracingService.getCompletedSpans(limit || 100);
  }

  @Get('tracing/stats/:traceId')
  @ApiOperation({ summary: 'Get trace statistics' })
  @ApiResponse({ status: 200, description: 'Trace statistics retrieved' })
  getTraceStats(@Param('traceId') traceId: string) {
    return this.tracingService.getTraceStats(traceId);
  }

  // ===== Performance Profiling Endpoints =====

  @Get('profiling/latest')
  @ApiOperation({ summary: 'Get latest performance profile' })
  @ApiResponse({ status: 200, description: 'Latest profile retrieved' })
  getLatestProfile() {
    return this.profilerService.getLatestProfile();
  }

  @Get('profiling/profiles')
  @ApiOperation({ summary: 'Get performance profiles' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Profiles retrieved' })
  getProfiles(@Query('limit') limit?: number) {
    return this.profilerService.getProfiles(limit || 10);
  }

  @Get('profiling/memory-trend')
  @ApiOperation({ summary: 'Get memory usage trend' })
  @ApiQuery({ name: 'period', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Memory trend retrieved' })
  getMemoryTrend(@Query('period') period?: number) {
    return this.profilerService.getMemoryTrend(period || 10);
  }

  @Get('profiling/operation-stats')
  @ApiOperation({ summary: 'Get all operation statistics' })
  @ApiResponse({ status: 200, description: 'Operation stats retrieved' })
  getOperationStats() {
    return this.profilerService.getAllOperationStats();
  }

  @Get('profiling/operation-stats/:operation')
  @ApiOperation({ summary: 'Get statistics for specific operation' })
  @ApiResponse({ status: 200, description: 'Operation statistics retrieved' })
  getOperationSpecificStats(@Param('operation') operation: string) {
    return this.profilerService.getOperationStats(operation);
  }

  @Get('profiling/report')
  @ApiOperation({ summary: 'Generate profiling report' })
  @ApiResponse({ status: 200, description: 'Profiling report generated' })
  getProfilingReport() {
    return this.profilerService.generateReport();
  }

  @Get('profiling/memory-leak-detection')
  @ApiOperation({ summary: 'Detect potential memory leaks' })
  @ApiResponse({ status: 200, description: 'Memory leak analysis completed' })
  detectMemoryLeaks() {
    return this.profilerService.detectMemoryLeaks();
  }

  @Post('profiling/capture-snapshot')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Capture memory snapshot' })
  @ApiResponse({ status: 200, description: 'Memory snapshot captured' })
  captureMemorySnapshot() {
    return this.profilerService.captureMemorySnapshot();
  }

  @Post('profiling/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset profiler data' })
  @ApiResponse({ status: 200, description: 'Profiler data reset' })
  resetProfiler() {
    this.profilerService.reset();
    return { message: 'Profiler reset successfully' };
  }

  // ===== Alerting Endpoints =====

  @Get('alerts/active')
  @ApiOperation({ summary: 'Get active alerts' })
  @ApiResponse({ status: 200, description: 'Active alerts retrieved' })
  getActiveAlerts() {
    return this.alertingService.getActiveAlerts();
  }

  @Get('alerts/history')
  @ApiOperation({ summary: 'Get alert history' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Alert history retrieved' })
  getAlertHistory(@Query('limit') limit?: number) {
    return this.alertingService.getAlertHistory(limit || 100);
  }

  @Get('alerts/stats')
  @ApiOperation({ summary: 'Get alert statistics' })
  @ApiResponse({ status: 200, description: 'Alert statistics retrieved' })
  getAlertStats() {
    return this.alertingService.getAlertStats();
  }

  @Post('alerts/:alertId/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolve an alert' })
  @ApiResponse({ status: 200, description: 'Alert resolved' })
  async resolveAlert(@Param('alertId') alertId: string) {
    await this.alertingService.resolveAlert(alertId);
    return { message: `Alert ${alertId} resolved` };
  }

  @Post('alerts/clear')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear all alerts' })
  @ApiResponse({ status: 200, description: 'All alerts cleared' })
  clearAlerts() {
    this.alertingService.clearAlerts();
    return { message: 'All alerts cleared' };
  }

  // ===== Existing APM Endpoints =====

  @Get('apm/transactions')
  @ApiOperation({ summary: 'Get active transactions' })
  @ApiResponse({ status: 200, description: 'Active transactions retrieved' })
  getActiveTransactions() {
    return this.apmService.getActiveTransactions();
  }

  @Get('apm/metrics')
  @ApiOperation({ summary: 'Get current performance metrics' })
  @ApiResponse({ status: 200, description: 'Current metrics retrieved' })
  getCurrentMetrics() {
    return this.apmService.getCurrentMetrics();
  }

  @Get('apm/snapshots')
  @ApiOperation({ summary: 'Get performance snapshots' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Performance snapshots retrieved' })
  getPerformanceSnapshots(@Query('limit') limit?: number) {
    return this.apmService.getPerformanceHistory(limit || 100);
  }

  @Get('apm/stats')
  @ApiOperation({ summary: 'Get performance statistics' })
  @ApiQuery({ name: 'start', required: true, type: String })
  @ApiQuery({ name: 'end', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Performance statistics retrieved' })
  getPerformanceStats(@Query('start') start: string, @Query('end') end: string) {
    return this.apmService.getPerformanceStats({
      start: new Date(start),
      end: new Date(end),
    });
  }

  @Get('database/optimizations')
  @ApiOperation({ summary: 'Get pending query optimizations' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Pending optimizations retrieved' })
  getPendingOptimizations(@Query('limit') limit?: number) {
    return this.databaseOptimization.getPendingOptimizations(limit || 50);
  }

  @Get('database/optimizations/stats')
  @ApiOperation({ summary: 'Get optimization statistics' })
  @ApiResponse({ status: 200, description: 'Optimization statistics retrieved' })
  getOptimizationStats() {
    return this.databaseOptimization.getOptimizationStats();
  }

  @Post('database/optimizations/:id/apply')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Apply query optimization' })
  @ApiResponse({ status: 200, description: 'Optimization applied' })
  applyOptimization(@Param('id') id: string) {
    return this.databaseOptimization.applyOptimization(id);
  }

  @Get('cache/metrics')
  @ApiOperation({ summary: 'Get cache metrics' })
  @ApiResponse({ status: 200, description: 'Cache metrics retrieved' })
  getCacheMetrics() {
    return this.cacheOptimization.getCacheMetrics();
  }

  @Get('cache/layers')
  @ApiOperation({ summary: 'Get cache layer information' })
  @ApiResponse({ status: 200, description: 'Cache layers retrieved' })
  getCacheLayers() {
    return this.cacheOptimization.getCacheLayers();
  }

  @Post('cache/clear')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear all cache layers' })
  @ApiResponse({ status: 200, description: 'Cache cleared' })
  clearCache() {
    return this.cacheOptimization.clearAll();
  }

  @Get('tuning/history')
  @ApiOperation({ summary: 'Get performance tuning history' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Tuning history retrieved' })
  getTuningHistory(@Query('limit') limit?: number) {
    return this.performanceTuning.getTuningHistory(limit || 100);
  }

  @Get('tuning/recommendations')
  @ApiOperation({ summary: 'Get recommended tuning actions' })
  @ApiResponse({ status: 200, description: 'Recommended actions retrieved' })
  getRecommendedActions() {
    return this.performanceTuning.getRecommendedActions();
  }

  @Post('tuning/run')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Run automated performance tuning' })
  @ApiResponse({ status: 200, description: 'Performance tuning completed' })
  runAutomatedTuning() {
    return this.performanceTuning.runAutomatedTuning();
  }

  @Get('analytics/dashboard')
  @ApiOperation({ summary: 'Get performance dashboard' })
  @ApiQuery({ name: 'start', required: true, type: String })
  @ApiQuery({ name: 'end', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved' })
  getDashboard(@Query('start') start: string, @Query('end') end: string) {
    return this.analyticsService.getDashboard({
      start: new Date(start),
      end: new Date(end),
    });
  }

  @Get('analytics/endpoints')
  @ApiOperation({ summary: 'Get endpoint performance breakdown' })
  @ApiQuery({ name: 'start', required: true, type: String })
  @ApiQuery({ name: 'end', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Endpoint performance retrieved' })
  getEndpointPerformance(@Query('start') start: string, @Query('end') end: string) {
    return this.analyticsService.getEndpointPerformance({
      start: new Date(start),
      end: new Date(end),
    });
  }

  @Get('analytics/reports')
  @ApiOperation({ summary: 'Get performance reports' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Reports retrieved' })
  getReports(@Query('limit') limit?: number) {
    return this.analyticsService.getReports(limit || 20);
  }

  @Get('analytics/reports/:id')
  @ApiOperation({ summary: 'Get performance report by ID' })
  @ApiResponse({ status: 200, description: 'Report retrieved' })
  getReport(@Param('id') id: string) {
    return this.analyticsService.getReport(id);
  }

  @Post('analytics/reports/generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate performance report' })
  @ApiResponse({ status: 200, description: 'Report generation started' })
  generateReport(
    @Body()
    body: {
      type: 'daily' | 'weekly' | 'monthly' | 'custom';
      startDate: string;
      endDate: string;
    },
  ) {
    return this.performanceTuning.generatePerformanceReport(
      body.type as any,
      new Date(body.startDate),
      new Date(body.endDate),
    );
  }

  @Post('load-test/run')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Run load test' })
  @ApiResponse({ status: 200, description: 'Load test started' })
  runLoadTest(@Body() config: LoadTestConfig) {
    return this.loadTesting.runLoadTest(config);
  }

  @Get('load-test/active')
  @ApiOperation({ summary: 'Get active load tests' })
  @ApiResponse({ status: 200, description: 'Active tests retrieved' })
  getActiveTests() {
    return this.loadTesting.getActiveTests();
  }

  @Get('load-test/history')
  @ApiOperation({ summary: 'Get load test history' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Test history retrieved' })
  getTestHistory(@Query('limit') limit?: number) {
    return this.loadTesting.getTestHistory(limit || 50);
  }

  @Get('load-test/:id')
  @ApiOperation({ summary: 'Get load test result by ID' })
  @ApiResponse({ status: 200, description: 'Test result retrieved' })
  getTest(@Param('id') id: string) {
    return this.loadTesting.getTest(id);
  }

  @Post('load-test/benchmark')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Run benchmark comparison' })
  @ApiResponse({ status: 200, description: 'Benchmark started' })
  runBenchmark(
    @Body()
    body: {
      configs: LoadTestConfig[];
      iterations?: number;
    },
  ) {
    return this.loadTesting.runBenchmark(body.configs, body.iterations || 3);
  }

  @Get('recommendations')
  @ApiOperation({ summary: 'Get optimization recommendations' })
  @ApiResponse({ status: 200, description: 'Recommendations retrieved' })
  getRecommendations() {
    return this.recommendationsService.getRecommendations();
  }

  @Get('recommendations/high-priority')
  @ApiOperation({ summary: 'Get high priority recommendations' })
  @ApiResponse({ status: 200, description: 'High priority recommendations retrieved' })
  getHighPriorityRecommendations() {
    return this.recommendationsService.getHighPriorityRecommendations();
  }

  @Get('recommendations/category/:category')
  @ApiOperation({ summary: 'Get recommendations by category' })
  @ApiResponse({ status: 200, description: 'Category recommendations retrieved' })
  getRecommendationsByCategory(@Param('category') category: string) {
    return this.recommendationsService.getRecommendationsByCategory(category);
  }

  @Get('recommendations/implementation-plan')
  @ApiOperation({ summary: 'Get implementation plan for recommendations' })
  @ApiResponse({ status: 200, description: 'Implementation plan retrieved' })
  getImplementationPlan() {
    return this.recommendationsService.getImplementationPlan();
  }

  @Get('real-time/dashboard')
  @ApiOperation({ summary: 'Get real-time monitoring dashboard' })
  @ApiResponse({ status: 200, description: 'Real-time dashboard data retrieved' })
  getRealTimeDashboard() {
    return this.realTimeService.getRealTimeDashboard();
  }

  @Get('real-time/anomalies')
  @ApiOperation({ summary: 'Get real-time anomalies' })
  @ApiResponse({ status: 200, description: 'Anomalies retrieved' })
  getAnomalies() {
    return this.realTimeService.getAnomalies();
  }

  @Get('real-time/alerts')
  @ApiOperation({ summary: 'Get real-time alerts' })
  @ApiResponse({ status: 200, description: 'Alerts retrieved' })
  getAlerts() {
    return this.realTimeService.getAlerts();
  }
}
