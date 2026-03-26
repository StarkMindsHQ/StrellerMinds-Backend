import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessMetricsService } from './business-metrics.service';
import { AdvancedPredictiveService } from './advanced-predictive.service';
import { CustomDashboardService } from './custom-dashboard.service';

/**
 * Analytics Reporting Service
 * Generates comprehensive analytics reports in multiple formats
 */
@Injectable()
export class AnalyticsReportingService {
  private readonly logger = new Logger(AnalyticsReportingService.name);

  constructor(
    private readonly metricsService: BusinessMetricsService,
    private readonly predictiveService: AdvancedPredictiveService,
    private readonly dashboardService: CustomDashboardService,
  ) {}

  /**
   * Generate executive summary report
   */
  async generateExecutiveReport(timeRange: TimeRange): Promise<ExecutiveReport> {
    const [metrics, kpiSummary, predictions] = await Promise.all([
      this.metricsService.getBusinessMetrics(timeRange),
      this.metricsService.getKPISummary(),
      this.predictiveService.predictRevenue(30),
    ]);

    const insights = this.generateExecutiveInsights(metrics);

    return {
      generatedAt: new Date().toISOString(),
      timeRange,
      summary: {
        totalUsers: metrics.users.totalUsers,
        activeUsers: metrics.users.monthlyActiveUsers,
        revenue: metrics.revenue.totalRevenue,
        completionRate: metrics.learning.averageCompletionRate,
        npsScore: metrics.engagement.npsScore,
      },
      trends: {
        userGrowth: metrics.users.userGrowthRate,
        revenueGrowth: metrics.revenue.revenueGrowth,
        engagementTrend: this.calculateEngagementTrend(metrics.engagement),
      },
      forecasts: {
        revenue: predictions,
      },
      insights,
      recommendations: this.generateExecutiveRecommendations(metrics),
    };
  }

  /**
   * Generate detailed analytics report
   */
  async generateDetailedReport(
    timeRange: TimeRange,
    sections: ReportSection[],
  ): Promise<DetailedReport> {
    const report: DetailedReport = {
      generatedAt: new Date().toISOString(),
      timeRange,
      sections: {},
    };

    for (const section of sections) {
      report.sections[section] = await this.generateReportSection(section, timeRange);
    }

    return report;
  }

  /**
   * Generate scheduled report
   */
  async generateScheduledReport(
    schedule: ReportSchedule,
  ): Promise<ScheduledReport> {
    const timeRange = this.calculateTimeRange(schedule.frequency);
    
    let report: ExecutiveReport | DetailedReport;
    
    if (schedule.reportType === 'executive') {
      report = await this.generateExecutiveReport(timeRange);
    } else {
      report = await this.generateDetailedReport(timeRange, schedule.sections || []);
    }

    const baseReport = {
      scheduleId: schedule.id,
      frequency: schedule.frequency,
      recipients: schedule.recipients,
      nextScheduledRun: this.calculateNextRun(schedule.frequency),
    };

    if ('summary' in report) {
      return { ...report, ...baseReport } as ScheduledReport;
    } else {
      // For detailed reports, we need to convert
      return {
        ...baseReport,
        generatedAt: report.generatedAt,
        timeRange: report.timeRange,
        summary: {
          totalUsers: 0,
          activeUsers: 0,
          revenue: 0,
          completionRate: 0,
          npsScore: 0,
        },
        trends: { userGrowth: 0, revenueGrowth: 0, engagementTrend: 'stable' },
        forecasts: { revenue: {} as any },
        insights: [],
        recommendations: [],
      };
    }
  }

  /**
   * Export report in specified format
   */
  async exportReport(
    reportId: string,
    format: 'pdf' | 'excel' | 'csv' | 'json',
  ): Promise<ReportExport> {
    // In a real implementation, this would generate actual files
    this.logger.log(`Exporting report ${reportId} as ${format}`);

    return {
      reportId,
      format,
      downloadUrl: `/api/reports/${reportId}/download?format=${format}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  /**
   * Generate comparison report
   */
  async generateComparisonReport(
    period1: TimeRange,
    period2: TimeRange,
    metrics: string[],
  ): Promise<ComparisonReport> {
    const [data1, data2] = await Promise.all([
      this.metricsService.getBusinessMetrics(period1),
      this.metricsService.getBusinessMetrics(period2),
    ]);

    const comparisons: MetricComparison[] = [];

    for (const metric of metrics) {
      const value1 = this.extractMetric(data1, metric);
      const value2 = this.extractMetric(data2, metric);
      
      comparisons.push({
        metric,
        period1: { value: value1, period: period1 },
        period2: { value: value2, period: period2 },
        change: value1 !== 0 ? ((value2 - value1) / value1) * 100 : 0,
        trend: value2 > value1 ? 'up' : value2 < value1 ? 'down' : 'stable',
      });
    }

    return {
      generatedAt: new Date().toISOString(),
      period1,
      period2,
      comparisons,
      summary: this.summarizeComparisons(comparisons),
    };
  }

  /**
   * Generate cohort analysis report
   */
  async generateCohortReport(cohortSize: 'day' | 'week' | 'month'): Promise<CohortReport> {
    const analysis = await this.metricsService.getCohortAnalysis(cohortSize);

    return {
      generatedAt: new Date().toISOString(),
      cohortSize,
      cohorts: analysis.cohorts,
      insights: this.analyzeCohorts(analysis.cohorts),
    };
  }

  /**
   * Generate funnel analysis report
   */
  async generateFunnelReport(steps: string[]): Promise<FunnelReport> {
    const analysis = await this.metricsService.getFunnelAnalysis(steps);

    return {
      generatedAt: new Date().toISOString(),
      steps: analysis.steps,
      overallConversionRate: analysis.overallConversionRate,
      insights: this.analyzeFunnel(analysis.steps),
      recommendations: this.generateFunnelRecommendations(analysis.steps),
    };
  }

  /**
   * Schedule a recurring report
   */
  async scheduleReport(config: ReportScheduleConfig): Promise<ReportSchedule> {
    const schedule: ReportSchedule = {
      id: this.generateId(),
      name: config.name,
      description: config.description,
      frequency: config.frequency,
      reportType: config.reportType,
      sections: config.sections,
      recipients: config.recipients,
      format: config.format,
      isActive: true,
      createdAt: new Date().toISOString(),
      nextRun: this.calculateNextRun(config.frequency),
    };

    this.logger.log(`Created report schedule: ${schedule.name} (${schedule.id})`);
    return schedule;
  }

  /**
   * Get report templates
   */
  getReportTemplates(): ReportTemplate[] {
    return [
      {
        id: 'monthly-executive',
        name: 'Monthly Executive Summary',
        description: 'High-level KPIs and trends for executives',
        type: 'executive',
        defaultFrequency: 'monthly',
        sections: ['summary', 'trends', 'forecasts'],
      },
      {
        id: 'weekly-performance',
        name: 'Weekly Performance Report',
        description: 'Detailed performance metrics for teams',
        type: 'detailed',
        defaultFrequency: 'weekly',
        sections: ['users', 'engagement', 'learning', 'revenue'],
      },
      {
        id: 'quarterly-review',
        name: 'Quarterly Business Review',
        description: 'Comprehensive quarterly analysis',
        type: 'detailed',
        defaultFrequency: 'quarterly',
        sections: ['users', 'engagement', 'learning', 'revenue', 'predictions', 'cohorts'],
      },
      {
        id: 'churn-analysis',
        name: 'Churn Risk Analysis',
        description: 'User churn predictions and at-risk analysis',
        type: 'detailed',
        defaultFrequency: 'weekly',
        sections: ['predictions', 'cohorts'],
      },
    ];
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async generateReportSection(
    section: ReportSection,
    timeRange: TimeRange,
  ): Promise<any> {
    switch (section) {
      case 'users':
        return this.metricsService.getBusinessMetrics(timeRange).then((m) => m.users);
      case 'engagement':
        return this.metricsService.getBusinessMetrics(timeRange).then((m) => m.engagement);
      case 'learning':
        return this.metricsService.getBusinessMetrics(timeRange).then((m) => m.learning);
      case 'revenue':
        return this.metricsService.getBusinessMetrics(timeRange).then((m) => m.revenue);
      case 'predictions':
        return this.predictiveService.predictRevenue(30);
      case 'cohorts':
        return this.metricsService.getCohortAnalysis('week');
      case 'funnel':
        return this.metricsService.getFunnelAnalysis(['signup', 'onboarding', 'first_course', 'completion']);
      default:
        return null;
    }
  }

  private generateExecutiveInsights(metrics: import('./business-metrics.service').BusinessMetrics): ExecutiveInsight[] {
    const insights: ExecutiveInsight[] = [];

    if (metrics.users.userGrowthRate > 20) {
      insights.push({
        type: 'growth',
        severity: 'positive',
        title: 'Strong User Growth',
        description: `User base growing at ${metrics.users.userGrowthRate.toFixed(1)}%`,
        recommendation: 'Consider scaling infrastructure',
      });
    }

    if (metrics.learning.averageCompletionRate < 40) {
      insights.push({
        type: 'engagement',
        severity: 'warning',
        title: 'Low Completion Rate',
        description: `Average completion rate is ${metrics.learning.averageCompletionRate}%`,
        recommendation: 'Review course difficulty and engagement strategies',
      });
    }

    if (metrics.engagement.npsScore > 50) {
      insights.push({
        type: 'satisfaction',
        severity: 'positive',
        title: 'High User Satisfaction',
        description: `NPS score of ${metrics.engagement.npsScore} indicates strong satisfaction`,
        recommendation: 'Leverage promoters for referrals',
      });
    }

    return insights;
  }

  private generateExecutiveRecommendations(
    metrics: import('./business-metrics.service').BusinessMetrics,
  ): string[] {
    const recommendations: string[] = [];

    if (metrics.users.churnRate > 10) {
      recommendations.push('Implement retention campaigns for at-risk users');
    }

    if (metrics.learning.averageCompletionRate < 50) {
      recommendations.push('Introduce gamification to improve course completion');
    }

    if (metrics.engagement.averageSessionDuration < 10) {
      recommendations.push('Optimize content for better engagement');
    }

    return recommendations;
  }

  private calculateEngagementTrend(engagement: import('./business-metrics.service').EngagementMetrics): string {
    if (engagement.eventsPerSession > 20) return 'strong';
    if (engagement.eventsPerSession > 10) return 'moderate';
    return 'weak';
  }

  private calculateTimeRange(frequency: ReportFrequency): TimeRange {
    const to = new Date();
    const from = new Date();

    switch (frequency) {
      case 'daily':
        from.setDate(from.getDate() - 1);
        break;
      case 'weekly':
        from.setDate(from.getDate() - 7);
        break;
      case 'monthly':
        from.setMonth(from.getMonth() - 1);
        break;
      case 'quarterly':
        from.setMonth(from.getMonth() - 3);
        break;
    }

    return { from: from.toISOString(), to: to.toISOString() };
  }

  private calculateNextRun(frequency: ReportFrequency): string {
    const next = new Date();
    
    switch (frequency) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'quarterly':
        next.setMonth(next.getMonth() + 3);
        break;
    }

    return next.toISOString();
  }

  private extractMetric(data: any, metric: string): number {
    const parts = metric.split('.');
    let value = data;
    
    for (const part of parts) {
      value = value?.[part];
    }
    
    return typeof value === 'number' ? value : 0;
  }

  private summarizeComparisons(comparisons: MetricComparison[]): ComparisonSummary {
    const improved = comparisons.filter((c) => c.trend === 'up').length;
    const declined = comparisons.filter((c) => c.trend === 'down').length;
    const stable = comparisons.filter((c) => c.trend === 'stable').length;

    return {
      totalMetrics: comparisons.length,
      improved,
      declined,
      stable,
      overallTrend: improved > declined ? 'positive' : improved < declined ? 'negative' : 'neutral',
    };
  }

  private analyzeCohorts(cohorts: import('./business-metrics.service').Cohort[]): CohortInsight[] {
    return [
      {
        period: 'Week 1',
        retentionRate: 85,
        insight: 'Strong initial retention',
      },
      {
        period: 'Week 4',
        retentionRate: 60,
        insight: 'Typical drop-off point',
      },
    ];
  }

  private analyzeFunnel(steps: import('./business-metrics.service').FunnelStep[]): FunnelInsight[] {
    const insights: FunnelInsight[] = [];

    for (let i = 1; i < steps.length; i++) {
      const dropOff = steps[i - 1].count - steps[i].count;
      const dropOffRate = (dropOff / steps[i - 1].count) * 100;

      if (dropOffRate > 50) {
        insights.push({
          step: steps[i].step,
          issue: 'High drop-off',
          dropOffRate,
          severity: 'critical',
        });
      }
    }

    return insights;
  }

  private generateFunnelRecommendations(steps: import('./business-metrics.service').FunnelStep[]): string[] {
    const recommendations: string[] = [];

    for (let i = 1; i < steps.length; i++) {
      const conversionRate = steps[i].conversionRate;
      
      if (conversionRate < 30) {
        recommendations.push(`Improve ${steps[i].step} conversion (currently ${conversionRate.toFixed(1)}%)`);
      }
    }

    return recommendations;
  }

  private generateId(): string {
    return `rpt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// Types and Interfaces
// ============================================================================

export type ReportSection = 'users' | 'engagement' | 'learning' | 'revenue' | 'predictions' | 'cohorts' | 'funnel' | 'summary' | 'trends' | 'forecasts';
export type ReportFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly';
export type ReportType = 'executive' | 'detailed';

export interface TimeRange {
  from: string;
  to: string;
}

export interface ExecutiveReport {
  generatedAt: string;
  timeRange: TimeRange;
  summary: {
    totalUsers: number;
    activeUsers: number;
    revenue: number;
    completionRate: number;
    npsScore: number;
  };
  trends: {
    userGrowth: number;
    revenueGrowth: number;
    engagementTrend: string;
  };
  forecasts: {
    revenue: import('./advanced-predictive.service').RevenuePrediction;
  };
  insights: ExecutiveInsight[];
  recommendations: string[];
}

export interface ExecutiveInsight {
  type: string;
  severity: 'positive' | 'warning' | 'critical';
  title: string;
  description: string;
  recommendation: string;
}

export interface DetailedReport {
  generatedAt: string;
  timeRange: TimeRange;
  sections: Record<string, any>;
}

export interface ScheduledReport extends ExecutiveReport {
  scheduleId: string;
  frequency: ReportFrequency;
  recipients: string[];
  nextScheduledRun: string;
}

export interface ReportExport {
  reportId: string;
  format: string;
  downloadUrl: string;
  expiresAt: string;
}

export interface ComparisonReport {
  generatedAt: string;
  period1: TimeRange;
  period2: TimeRange;
  comparisons: MetricComparison[];
  summary: ComparisonSummary;
}

export interface MetricComparison {
  metric: string;
  period1: { value: number; period: TimeRange };
  period2: { value: number; period: TimeRange };
  change: number;
  trend: 'up' | 'down' | 'stable';
}

export interface ComparisonSummary {
  totalMetrics: number;
  improved: number;
  declined: number;
  stable: number;
  overallTrend: 'positive' | 'negative' | 'neutral';
}

export interface CohortReport {
  generatedAt: string;
  cohortSize: string;
  cohorts: import('./business-metrics.service').Cohort[];
  insights: CohortInsight[];
}

export interface CohortInsight {
  period: string;
  retentionRate: number;
  insight: string;
}

export interface FunnelReport {
  generatedAt: string;
  steps: import('./business-metrics.service').FunnelStep[];
  overallConversionRate: number;
  insights: FunnelInsight[];
  recommendations: string[];
}

export interface FunnelInsight {
  step: string;
  issue: string;
  dropOffRate: number;
  severity: 'medium' | 'high' | 'critical';
}

export interface ReportSchedule {
  id: string;
  name: string;
  description?: string;
  frequency: ReportFrequency;
  reportType: ReportType;
  sections?: ReportSection[];
  recipients: string[];
  format: 'pdf' | 'excel' | 'csv';
  isActive: boolean;
  createdAt: string;
  nextRun: string;
}

export interface ReportScheduleConfig {
  name: string;
  description?: string;
  frequency: ReportFrequency;
  reportType: ReportType;
  sections?: ReportSection[];
  recipients: string[];
  format: 'pdf' | 'excel' | 'csv';
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: ReportType;
  defaultFrequency: ReportFrequency;
  sections: ReportSection[];
}
