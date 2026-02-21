import { Injectable } from '@nestjs/common';
import { ReportType } from '../entities/analytics-report.entity';

export interface Insight {
  type: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  data?: any;
}

@Injectable()
export class PredictiveAnalyticsService {
  async generateInsights(data: any, reportType: ReportType): Promise<Insight[]> {
    const insights: Insight[] = [];

    switch (reportType) {
      case ReportType.USER_ENGAGEMENT:
        insights.push(...this.analyzeUserEngagement(data));
        break;
      case ReportType.FINANCIAL:
        insights.push(...this.analyzeFinancialData(data));
        break;
      case ReportType.COURSE_PERFORMANCE:
        insights.push(...this.analyzeCoursePerformance(data));
        break;
      case ReportType.SYSTEM_HEALTH:
        insights.push(...this.analyzeSystemHealth(data));
        break;
    }

    return insights;
  }

  private analyzeUserEngagement(data: any): Insight[] {
    const insights: Insight[] = [];

    if (data.summary) {
      const { engagementRate, activeUsers, totalUsers } = data.summary;

      if (engagementRate < 20) {
        insights.push({
          type: 'low_engagement',
          message: `Engagement rate is low at ${engagementRate.toFixed(2)}%. Consider implementing user retention strategies.`,
          severity: 'warning',
          data: { engagementRate, activeUsers, totalUsers },
        });
      } else if (engagementRate > 70) {
        insights.push({
          type: 'high_engagement',
          message: `Excellent engagement rate of ${engagementRate.toFixed(2)}%! Users are highly active.`,
          severity: 'info',
          data: { engagementRate },
        });
      }

      if (data.timeSeriesData && data.timeSeriesData.length > 1) {
        const trend = this.calculateTrend(data.timeSeriesData);
        if (trend < -10) {
          insights.push({
            type: 'declining_trend',
            message: `User activity is declining by ${Math.abs(trend).toFixed(2)}%. Investigate potential issues.`,
            severity: 'critical',
            data: { trend },
          });
        } else if (trend > 10) {
          insights.push({
            type: 'growing_trend',
            message: `User activity is growing by ${trend.toFixed(2)}%. Great momentum!`,
            severity: 'info',
            data: { trend },
          });
        }
      }
    }

    return insights;
  }

  private analyzeFinancialData(data: any): Insight[] {
    const insights: Insight[] = [];

    if (data.summary) {
      const { totalRevenue, totalRefunds, netRevenue, transactionCount } = data.summary;

      const refundRate = (totalRefunds / totalRevenue) * 100;
      if (refundRate > 10) {
        insights.push({
          type: 'high_refund_rate',
          message: `Refund rate is ${refundRate.toFixed(2)}%, which is above the healthy threshold of 10%.`,
          severity: 'warning',
          data: { refundRate, totalRefunds, totalRevenue },
        });
      }

      if (data.timeSeriesData && data.timeSeriesData.length > 1) {
        const revenueTrend = this.calculateTrend(data.timeSeriesData);
        if (revenueTrend > 15) {
          insights.push({
            type: 'revenue_growth',
            message: `Revenue is growing at ${revenueTrend.toFixed(2)}% rate. Consider scaling operations.`,
            severity: 'info',
            data: { revenueTrend },
          });
        } else if (revenueTrend < -15) {
          insights.push({
            type: 'revenue_decline',
            message: `Revenue is declining at ${Math.abs(revenueTrend).toFixed(2)}% rate. Immediate action required.`,
            severity: 'critical',
            data: { revenueTrend },
          });
        }
      }

      const predictedNextMonthRevenue = this.predictNextPeriodValue(
        data.timeSeriesData || [],
        'count',
      );
      if (predictedNextMonthRevenue) {
        insights.push({
          type: 'revenue_forecast',
          message: `Predicted revenue for next period: $${predictedNextMonthRevenue.toFixed(2)}`,
          severity: 'info',
          data: { predictedRevenue: predictedNextMonthRevenue },
        });
      }
    }

    return insights;
  }

  private analyzeCoursePerformance(data: any): Insight[] {
    const insights: Insight[] = [];

    if (data.summary) {
      const { completionRate } = data.summary;

      if (completionRate < 30) {
        insights.push({
          type: 'low_completion',
          message: `Course completion rate is ${completionRate.toFixed(2)}%. Review course content and difficulty.`,
          severity: 'warning',
          data: { completionRate },
        });
      }
    }

    return insights;
  }

  private analyzeSystemHealth(data: any): Insight[] {
    const insights: Insight[] = [];

    if (data.summary) {
      const { errorRate, avgResponseTime, uptime } = data.summary;

      if (errorRate > 5) {
        insights.push({
          type: 'high_error_rate',
          message: `Error rate is ${errorRate.toFixed(2)}%, exceeding the 5% threshold.`,
          severity: 'critical',
          data: { errorRate },
        });
      }

      if (avgResponseTime > 1000) {
        insights.push({
          type: 'slow_response',
          message: `Average response time is ${avgResponseTime}ms. Consider performance optimization.`,
          severity: 'warning',
          data: { avgResponseTime },
        });
      }

      if (uptime < 99.5) {
        insights.push({
          type: 'low_uptime',
          message: `System uptime is ${uptime}%, below the 99.5% SLA target.`,
          severity: 'critical',
          data: { uptime },
        });
      }
    }

    return insights;
  }

  private calculateTrend(timeSeriesData: any[]): number {
    if (timeSeriesData.length < 2) return 0;

    const firstValue = timeSeriesData[0].count;
    const lastValue = timeSeriesData[timeSeriesData.length - 1].count;

    return ((lastValue - firstValue) / firstValue) * 100;
  }

  private predictNextPeriodValue(timeSeriesData: any[], field: string): number | null {
    if (timeSeriesData.length < 2) return null;

    const values = timeSeriesData.map((d) => d[field]);
    const n = values.length;

    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return slope * n + intercept;
  }
}
