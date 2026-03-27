import { Controller, Get, Header, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MetricsService } from '../metrics.service';
import { BusinessMetricsService } from '../services/business-metrics.service';

@ApiTags('Metrics')
@Controller('metrics')
export class MetricsController {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly businessMetricsService: BusinessMetricsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get Prometheus metrics' })
  @ApiResponse({ status: 200, description: 'Prometheus metrics retrieved' })
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async getMetrics(): Promise<string> {
    return this.metricsService.getMetricsAsPrometheus();
  }

  @Get('json')
  @ApiOperation({ summary: 'Get metrics in JSON format' })
  @ApiResponse({ status: 200, description: 'Metrics retrieved in JSON format' })
  async getMetricsAsJson(): Promise<object> {
    return this.metricsService.getMetricsAsJson();
  }

  @Get('health')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Metrics health check' })
  @ApiResponse({ status: 200, description: 'Metrics service is healthy' })
  healthCheck() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'metrics',
    };
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get metrics summary' })
  @ApiResponse({ status: 200, description: 'Metrics summary retrieved' })
  async getMetricsSummary() {
    const metrics = await this.metricsService.getMetricsAsJson();
    const metricsArray = Array.isArray(metrics) ? metrics : [];
    
    // Group metrics by category
    const summary = {
      http: this.extractMetricsByPrefix(metricsArray, 'http_'),
      errors: this.extractMetricsByPrefix(metricsArray, 'error'),
      security: this.extractMetricsByPrefix(metricsArray, 'security_'),
      business: this.extractMetricsByPrefix(metricsArray, [
        'user_',
        'course_',
        'payment',
        'subscription',
        'content_',
        'forum_',
        'search_',
        'notification',
      ]),
      performance: this.extractMetricsByPrefix(metricsArray, [
        'database_',
        'cache_',
        'event_loop',
        'gc_',
        'heap_',
        'rss_',
        'cpu_',
      ]),
      api: this.extractMetricsByPrefix(metricsArray, 'api_'),
      queue: this.extractMetricsByPrefix(metricsArray, 'queue_'),
      email: this.extractMetricsByPrefix(metricsArray, 'email'),
      file: this.extractMetricsByPrefix(metricsArray, 'file_'),
      blockchain: this.extractMetricsByPrefix(metricsArray, 'blockchain_'),
      system: this.extractMetricsByPrefix(metricsArray, [
        'process_',
        'nodejs_',
      ]),
    };

    return {
      timestamp: new Date().toISOString(),
      summary,
    };
  }

  private extractMetricsByPrefix(metrics: any[], prefixes: string | string[]): any[] {
    const prefixArray = Array.isArray(prefixes) ? prefixes : [prefixes];
    return metrics.filter((metric: any) =>
      prefixArray.some((prefix) => metric.name?.startsWith(prefix)),
    );
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get metrics statistics' })
  @ApiResponse({ status: 200, description: 'Metrics statistics retrieved' })
  async getMetricsStats() {
    const metrics = await this.metricsService.getMetricsAsJson();
    const metricsArray = Array.isArray(metrics) ? metrics : [];
    
    const stats = {
      totalMetrics: metricsArray.length,
      metricsByType: {
        counters: metricsArray.filter((m: any) => m.type === 'counter').length,
        gauges: metricsArray.filter((m: any) => m.type === 'gauge').length,
        histograms: metricsArray.filter((m: any) => m.type === 'histogram').length,
        summaries: metricsArray.filter((m: any) => m.type === 'summary').length,
      },
      timestamp: new Date().toISOString(),
    };

    return stats;
  }
}
