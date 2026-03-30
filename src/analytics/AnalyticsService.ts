import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StreamProcessor, AnalyticsEvent } from './StreamProcessor';
import { EventAggregator, AggregatedData, AggregationRule } from './EventAggregator';
import { MetricsCalculator, CalculatedMetric, MetricDefinition, MetricAlert } from './MetricsCalculator';
import { interval, Subject } from 'rxjs';
import { takeUntil, mergeMap } from 'rxjs/operators';

export interface AnalyticsConfig {
  retentionPolicy: {
    rawEvents: number; // days
    aggregatedData: number; // days
    metrics: number; // days
    alerts: number; // days
  };
  dataPrivacy: {
    anonymizeUserIds: boolean;
    anonymizeIpAddresses: boolean;
    retentionPeriod: number; // days
  };
  performance: {
    batchSize: number;
    processingInterval: number; // milliseconds
    compressionEnabled: boolean;
  };
  dashboard: {
    refreshInterval: number; // seconds
    maxDataPoints: number;
    defaultTimeRange: string; // e.g., '24h', '7d', '30d'
  };
}

export interface DashboardData {
  metrics: CalculatedMetric[];
  alerts: MetricAlert[];
  trends: Array<{
    metric: string;
    data: Array<{ timestamp: Date; value: number }>;
    trend: 'up' | 'down' | 'stable';
  }>;
  summary: {
    totalEvents: number;
    activeUsers: number;
    errorRate: number;
    systemHealth: 'healthy' | 'warning' | 'critical';
  };
}

export interface AnalyticsReport {
  id: string;
  name: string;
  description: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  metrics: CalculatedMetric[];
  insights: Array<{
    type: string;
    title: string;
    description: string;
    impact: 'low' | 'medium' | 'high';
    recommendation?: string;
  }>;
  generatedAt: Date;
  generatedBy: string;
}

@Injectable()
export class AnalyticsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AnalyticsService.name);
  private config: AnalyticsConfig;
  private destroy$ = new Subject<void>();
  private dashboardRefreshInterval: NodeJS.Timeout;

  constructor(
    private streamProcessor: StreamProcessor,
    private eventAggregator: EventAggregator,
    private metricsCalculator: MetricsCalculator,
    private eventEmitter: EventEmitter2,
  ) {
    this.config = this.getDefaultConfig();
  }

  async onModuleInit() {
    this.logger.log('Initializing Analytics Service...');
    await this.setupEventHandlers();
    await this.startDashboardRefresh();
    await this.initializeDataRetention();
  }

  async onModuleDestroy() {
    this.logger.log('Shutting down Analytics Service...');
    this.destroy$.next();
    this.destroy$.complete();
    
    if (this.dashboardRefreshInterval) {
      clearInterval(this.dashboardRefreshInterval);
    }
  }

  // Event Tracking
  async trackEvent(event: Partial<AnalyticsEvent>): Promise<void> {
    const fullEvent: AnalyticsEvent = {
      id: this.generateEventId(),
      type: event.type || 'unknown',
      timestamp: new Date(),
      service: event.service || 'unknown',
      data: event.data || {},
      userId: event.userId,
      sessionId: event.sessionId,
      metadata: event.metadata,
    };

    // Apply privacy settings
    if (this.config.dataPrivacy.anonymizeUserIds && fullEvent.userId) {
      fullEvent.userId = this.anonymizeId(fullEvent.userId);
    }

    // Validate event
    if (!this.streamProcessor.validateEvent(fullEvent)) {
      throw new Error(`Invalid event: ${JSON.stringify(fullEvent)}`);
    }

    // Publish event
    await this.streamProcessor.publishEvent(fullEvent);
    
    // Add to aggregator
    await this.eventAggregator.addEvent(fullEvent);

    this.logger.debug(`Tracked event: ${fullEvent.type} for service: ${fullEvent.service}`);
  }

  async trackUserAction(
    userId: string,
    action: string,
    data: Record<string, any> = {},
    sessionId?: string,
  ): Promise<void> {
    await this.trackEvent({
      type: 'user_action',
      userId,
      sessionId,
      service: 'user',
      data: {
        action,
        ...data,
      },
    });
  }

  async trackApiRequest(
    service: string,
    endpoint: string,
    method: string,
    statusCode: number,
    responseTime: number,
    userId?: string,
    data: Record<string, any> = {},
  ): Promise<void> {
    await this.trackEvent({
      type: 'api_request',
      service,
      data: {
        endpoint,
        method,
        statusCode,
        responseTime,
        ...data,
      },
      userId,
    });
  }

  async trackError(
    service: string,
    error: Error,
    context: Record<string, any> = {},
    userId?: string,
  ): Promise<void> {
    await this.trackEvent({
      type: 'error_occurred',
      service,
      data: {
        message: error.message,
        stack: error.stack,
        name: error.name,
        ...context,
      },
      userId,
    });
  }

  async trackCourseInteraction(
    userId: string,
    courseId: string,
    interaction: string,
    data: Record<string, any> = {},
  ): Promise<void> {
    await this.trackEvent({
      type: 'course_interaction',
      userId,
      service: 'course',
      data: {
        courseId,
        interaction,
        ...data,
      },
    });
  }

  async trackPaymentTransaction(
    userId: string,
    transactionId: string,
    status: string,
    amount: number,
    method: string,
    data: Record<string, any> = {},
  ): Promise<void> {
    await this.trackEvent({
      type: 'payment_transaction',
      userId,
      service: 'payment',
      data: {
        transactionId,
        status,
        amount,
        method,
        ...data,
      },
    });
  }

  // Data Querying
  async getEvents(
    filters: {
      service?: string;
      type?: string;
      userId?: string;
      startTime?: Date;
      endTime?: Date;
    } = {},
    limit = 100,
  ): Promise<AnalyticsEvent[]> {
    return this.streamProcessor.getEvents(
      filters.service,
      filters.type,
      filters.startTime,
      filters.endTime,
      limit,
    );
  }

  async getAggregatedData(
    ruleName: string,
    startTime?: Date,
    endTime?: Date,
    dimensions?: Record<string, any>,
  ): Promise<AggregatedData[]> {
    return this.eventAggregator.getAggregatedData(ruleName, startTime, endTime, dimensions);
  }

  async getMetrics(
    metricNames: string[],
    startTime?: Date,
    endTime?: Date,
    tags?: Record<string, string>,
  ): Promise<Record<string, CalculatedMetric[]>> {
    const results: Record<string, CalculatedMetric[]> = {};
    
    for (const metricName of metricNames) {
      results[metricName] = await this.metricsCalculator.getMetric(
        metricName,
        startTime,
        endTime,
        tags,
      );
    }
    
    return results;
  }

  async getRealTimeMetrics(metricNames?: string[]): Promise<Record<string, any>> {
    const metrics = metricNames || (await this.metricsCalculator.getMetricDefinitions())
      .map(m => m.name);
    
    const results: Record<string, any> = {};
    
    for (const metricName of metrics) {
      try {
        results[metricName] = await this.metricsCalculator.getRealTimeMetrics(metricName);
      } catch (error) {
        this.logger.warn(`Failed to get real-time metrics for: ${metricName}`, error);
      }
    }
    
    return results;
  }

  // Dashboard
  async getDashboardData(timeRange = '24h'): Promise<DashboardData> {
    const { start, end } = this.parseTimeRange(timeRange);
    
    // Get key metrics
    const keyMetrics = [
      'user_activity_rate',
      'error_rate',
      'api_response_time',
      'course_completion_rate',
      'payment_success_rate',
    ];
    
    const metrics = await this.getMetrics(keyMetrics, start, end);
    
    // Get recent alerts
    const alerts = await this.metricsCalculator.getAlerts(start, end);
    
    // Calculate trends
    const trends = await this.calculateTrends(keyMetrics, start, end);
    
    // Generate summary
    const summary = await this.generateSummary(start, end);
    
    return {
      metrics: Object.values(metrics).flat(),
      alerts,
      trends,
      summary,
    };
  }

  async createCustomDashboard(
    name: string,
    metricNames: string[],
    timeRange = '24h',
  ): Promise<Record<string, any>> {
    const dashboard = {
      id: this.generateDashboardId(),
      name,
      metricNames,
      timeRange,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Save dashboard configuration
    await this.saveDashboardConfig(dashboard);
    
    return dashboard;
  }

  // Reports
  async generateReport(
    name: string,
    description: string,
    timeRange: { start: Date; end: Date },
    metricNames: string[],
    userId: string,
  ): Promise<AnalyticsReport> {
    const metrics = await this.getMetrics(metricNames, timeRange.start, timeRange.end);
    const insights = await this.generateInsights(metrics, timeRange);
    
    const report: AnalyticsReport = {
      id: this.generateReportId(),
      name,
      description,
      timeRange,
      metrics: Object.values(metrics).flat(),
      insights,
      generatedAt: new Date(),
      generatedBy: userId,
    };
    
    // Save report
    await this.saveReport(report);
    
    return report;
  }

  async getReports(userId?: string): Promise<AnalyticsReport[]> {
    return this.getSavedReports(userId);
  }

  // Configuration Management
  async updateConfig(updates: Partial<AnalyticsConfig>): Promise<void> {
    this.config = { ...this.config, ...updates };
    await this.saveConfig();
    
    // Apply retention policy changes
    if (updates.retentionPolicy) {
      await this.updateRetentionPolicy(updates.retentionPolicy);
    }
  }

  async getConfig(): Promise<AnalyticsConfig> {
    return { ...this.config };
  }

  // Aggregation Rules
  async addAggregationRule(rule: AggregationRule): Promise<void> {
    await this.eventAggregator.addAggregationRule(rule);
  }

  async getAggregationRules(): Promise<AggregationRule[]> {
    return this.eventAggregator.getAggregationRules();
  }

  // Metric Definitions
  async addMetricDefinition(definition: MetricDefinition): Promise<void> {
    await this.metricsCalculator.addMetricDefinition(definition);
  }

  async getMetricDefinitions(): Promise<MetricDefinition[]> {
    return this.metricsCalculator.getMetricDefinitions();
  }

  // Data Management
  async exportData(
    timeRange: { start: Date; end: Date },
    format: 'json' | 'csv' = 'json',
  ): Promise<any> {
    const events = await this.getEvents({
      startTime: timeRange.start,
      endTime: timeRange.end,
    });
    
    if (format === 'csv') {
      return this.convertToCSV(events);
    }
    
    return events;
  }

  async importData(events: AnalyticsEvent[]): Promise<{ imported: number; failed: number }> {
    let imported = 0;
    let failed = 0;
    
    for (const event of events) {
      try {
        await this.trackEvent(event);
        imported++;
      } catch (error) {
        failed++;
        this.logger.error(`Failed to import event: ${event.id}`, error);
      }
    }
    
    return { imported, failed };
  }

  async cleanupOldData(): Promise<void> {
    const now = new Date();
    
    // Clean up raw events
    const eventsRetention = new Date(now.getTime() - this.config.retentionPolicy.rawEvents * 24 * 60 * 60 * 1000);
    await this.cleanupEventsBefore(eventsRetention);
    
    // Clean up aggregated data
    const aggregatedRetention = new Date(now.getTime() - this.config.retentionPolicy.aggregatedData * 24 * 60 * 60 * 1000);
    await this.cleanupAggregatedDataBefore(aggregatedRetention);
    
    // Clean up old metrics
    const metricsRetention = new Date(now.getTime() - this.config.retentionPolicy.metrics * 24 * 60 * 60 * 1000);
    await this.cleanupMetricsBefore(metricsRetention);
    
    // Clean up old alerts
    const alertsRetention = new Date(now.getTime() - this.config.retentionPolicy.alerts * 24 * 60 * 60 * 1000);
    await this.cleanupAlertsBefore(alertsRetention);
    
    this.logger.log('Completed cleanup of old data');
  }

  // Private Methods
  private getDefaultConfig(): AnalyticsConfig {
    return {
      retentionPolicy: {
        rawEvents: 30,
        aggregatedData: 90,
        metrics: 365,
        alerts: 90,
      },
      dataPrivacy: {
        anonymizeUserIds: false,
        anonymizeIpAddresses: true,
        retentionPeriod: 365,
      },
      performance: {
        batchSize: 1000,
        processingInterval: 5000,
        compressionEnabled: true,
      },
      dashboard: {
        refreshInterval: 30,
        maxDataPoints: 1000,
        defaultTimeRange: '24h',
      },
    };
  }

  private async setupEventHandlers(): Promise<void> {
    // Handle stream processor events
    this.eventEmitter.on('analytics.event.published', (event: AnalyticsEvent) => {
      this.logger.debug(`Event published: ${event.type}`);
    });

    this.eventEmitter.on('analytics.event.failed', (data: { event: AnalyticsEvent; error: string }) => {
      this.logger.error(`Event failed: ${data.event.id}`, data.error);
    });

    this.eventEmitter.on('analytics.processing.completed', (data: any) => {
      this.logger.debug(`Processing completed for ${data.service}: ${data.processed} processed, ${data.failed} failed`);
    });

    // Handle health checks
    this.eventEmitter.on('analytics.health.check', (data: any) => {
      if (data.status === 'unhealthy') {
        this.logger.warn(`Analytics health check failed: ${data.error}`);
      }
    });
  }

  private async startDashboardRefresh(): Promise<void> {
    const intervalMs = this.config.dashboard.refreshInterval * 1000;
    
    this.dashboardRefreshInterval = setInterval(async () => {
      try {
        const dashboardData = await this.getDashboardData(this.config.dashboard.defaultTimeRange);
        this.eventEmitter.emit('analytics.dashboard.updated', dashboardData);
      } catch (error) {
        this.logger.error('Dashboard refresh failed', error);
      }
    }, intervalMs);
  }

  private async initializeDataRetention(): Promise<void> {
    // Schedule daily cleanup
    const cleanupInterval = interval(24 * 60 * 60 * 1000).pipe(
      takeUntil(this.destroy$),
      mergeMap(async () => {
        try {
          await this.cleanupOldData();
        } catch (error) {
          this.logger.error('Data cleanup failed', error);
        }
      })
    );

    cleanupInterval.subscribe();
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateDashboardId(): string {
    return `dash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateReportId(): string {
    return `rpt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private anonymizeId(id: string): string {
    // Simple hashing - in production, use proper cryptographic hashing
    return Buffer.from(id).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
  }

  private parseTimeRange(timeRange: string): { start: Date; end: Date } {
    const now = new Date();
    const end = now;
    let start: Date;

    switch (timeRange) {
      case '1h':
        start = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    return { start, end };
  }

  private async calculateTrends(
    metricNames: string[],
    start: Date,
    end: Date,
  ): Promise<Array<{ metric: string; data: Array<{ timestamp: Date; value: number }>; trend: 'up' | 'down' | 'stable' }>> {
    const trends = [];

    for (const metricName of metricNames) {
      try {
        const history = await this.metricsCalculator.getMetricHistory(metricName, start, end);
        const trend = this.calculateTrendDirection(history);
        
        trends.push({
          metric: metricName,
          data: history,
          trend,
        });
      } catch (error) {
        this.logger.warn(`Failed to calculate trend for: ${metricName}`, error);
      }
    }

    return trends;
  }

  private calculateTrendDirection(data: Array<{ timestamp: Date; value: number }>): 'up' | 'down' | 'stable' {
    if (data.length < 2) return 'stable';

    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));

    const firstAvg = firstHalf.reduce((sum, d) => sum + d.value, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.value, 0) / secondHalf.length;

    const change = (secondAvg - firstAvg) / firstAvg;

    if (change > 0.1) return 'up';
    if (change < -0.1) return 'down';
    return 'stable';
  }

  private async generateSummary(start: Date, end: Date): Promise<any> {
    const totalEvents = (await this.getEvents({ startTime: start, endTime: end })).length;
    const errorRateMetric = await this.metricsCalculator.getMetric('error_rate', (end.getTime() - start.getTime()) / (60 * 1000));
    const errorRate = errorRateMetric[0]?.value || 0;

    let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (errorRate > 10) systemHealth = 'critical';
    else if (errorRate > 5) systemHealth = 'warning';

    return {
      totalEvents,
      activeUsers: await this.getActiveUsersCount(start, end),
      errorRate,
      systemHealth,
    };
  }

  private async getActiveUsersCount(start: Date, end: Date): Promise<number> {
    const events = await this.getEvents({
      type: 'user_action',
      startTime: start,
      endTime: end,
    });

    const uniqueUsers = new Set(events.map(e => e.userId).filter(Boolean));
    return uniqueUsers.size;
  }

  private async generateInsights(
    metrics: Record<string, CalculatedMetric[]>,
    timeRange: { start: Date; end: Date },
  ): Promise<Array<{ type: string; title: string; description: string; impact: 'low' | 'medium' | 'high'; recommendation?: string }>> {
    const insights = [];

    for (const [metricName, metricData] of Object.entries(metrics)) {
      const latest = metricData[0];
      if (!latest) continue;

      if (latest.status === 'critical') {
        insights.push({
          type: 'alert',
          title: `Critical threshold exceeded for ${metricName}`,
          description: `Current value ${latest.value} ${latest.unit} exceeds critical threshold`,
          impact: 'high' as const,
          recommendation: `Investigate ${metricName} immediately and take corrective action`,
        });
      } else if (latest.status === 'warning') {
        insights.push({
          type: 'warning',
          title: `Warning threshold exceeded for ${metricName}`,
          description: `Current value ${latest.value} ${latest.unit} exceeds warning threshold`,
          impact: 'medium' as const,
          recommendation: `Monitor ${metricName} closely and prepare for potential intervention`,
        });
      }
    }

    return insights;
  }

  private async saveConfig(): Promise<void> {
    // Implementation would save to database or config file
    this.logger.debug('Analytics configuration saved');
  }

  private async saveDashboardConfig(dashboard: any): Promise<void> {
    // Implementation would save to database
    this.logger.debug(`Dashboard configuration saved: ${dashboard.id}`);
  }

  private async saveReport(report: AnalyticsReport): Promise<void> {
    // Implementation would save to database
    this.logger.debug(`Report saved: ${report.id}`);
  }

  private async getSavedReports(userId?: string): Promise<AnalyticsReport[]> {
    // Implementation would load from database
    return [];
  }

  private async updateRetentionPolicy(retentionPolicy: any): Promise<void> {
    // Implementation would update retention settings
    this.logger.debug('Retention policy updated');
  }

  private async cleanupEventsBefore(date: Date): Promise<void> {
    // Implementation would clean up old events from storage
    this.logger.debug(`Cleaned up events before ${date}`);
  }

  private async cleanupAggregatedDataBefore(date: Date): Promise<void> {
    // Implementation would clean up old aggregated data
    this.logger.debug(`Cleaned up aggregated data before ${date}`);
  }

  private async cleanupMetricsBefore(date: Date): Promise<void> {
    // Implementation would clean up old metrics
    this.logger.debug(`Cleaned up metrics before ${date}`);
  }

  private async cleanupAlertsBefore(date: Date): Promise<void> {
    // Implementation would clean up old alerts
    this.logger.debug(`Cleaned up alerts before ${date}`);
  }

  private convertToCSV(events: AnalyticsEvent[]): string {
    const headers = ['id', 'type', 'timestamp', 'userId', 'service', 'data'];
    const rows = events.map(event => [
      event.id,
      event.type,
      event.timestamp.toISOString(),
      event.userId || '',
      event.service,
      JSON.stringify(event.data),
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
}
