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
  ) {}

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
}
