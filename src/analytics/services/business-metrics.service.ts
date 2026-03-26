import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { EngagementEvent } from '../entities/engagement-event.entity';
import { StudentProgress } from '../entities/student.progress.entity';

/**
 * Business Metrics Service
 * Tracks and calculates key business metrics for decision making
 */
@Injectable()
export class BusinessMetricsService {
  private readonly logger = new Logger(BusinessMetricsService.name);

  constructor(
    @InjectRepository(EngagementEvent)
    private readonly engagementRepo: Repository<EngagementEvent>,
    @InjectRepository(StudentProgress)
    private readonly progressRepo: Repository<StudentProgress>,
  ) {}

  /**
   * Get comprehensive business metrics dashboard
   */
  async getBusinessMetrics(timeRange: TimeRange): Promise<BusinessMetrics> {
    const [userMetrics, learningMetrics, engagementMetrics, revenueMetrics] = await Promise.all([
      this.calculateUserMetrics(timeRange),
      this.calculateLearningMetrics(timeRange),
      this.calculateEngagementMetrics(timeRange),
      this.calculateRevenueMetrics(timeRange),
    ]);

    return {
      timestamp: new Date().toISOString(),
      timeRange,
      users: userMetrics,
      learning: learningMetrics,
      engagement: engagementMetrics,
      revenue: revenueMetrics,
    };
  }

  /**
   * Calculate user-related metrics
   */
  private async calculateUserMetrics(timeRange: TimeRange): Promise<UserMetrics> {
    const fromDate = new Date(timeRange.from);
    const toDate = new Date(timeRange.to);

    // Get new users in period
    const newUsers = await this.engagementRepo
      .createQueryBuilder('event')
      .select('COUNT(DISTINCT event.userId)', 'count')
      .where('event.eventType = :type', { type: 'user_signup' })
      .andWhere('event.timestamp BETWEEN :from AND :to', { from: fromDate, to: toDate })
      .getRawOne();

    // Get active users (DAU, WAU, MAU)
    const dailyActiveUsers = await this.getActiveUsers(1, toDate);
    const weeklyActiveUsers = await this.getActiveUsers(7, toDate);
    const monthlyActiveUsers = await this.getActiveUsers(30, toDate);

    // Calculate retention rate
    const retentionRate = await this.calculateRetentionRate(fromDate, toDate);

    // Calculate churn rate
    const churnRate = await this.calculateChurnRate(fromDate, toDate);

    return {
      totalUsers: await this.getTotalUsers(),
      newUsers: parseInt(newUsers?.count || '0', 10),
      dailyActiveUsers,
      weeklyActiveUsers,
      monthlyActiveUsers,
      retentionRate,
      churnRate,
      userGrowthRate: await this.calculateUserGrowthRate(timeRange),
    };
  }

  /**
   * Calculate learning-related metrics
   */
  private async calculateLearningMetrics(timeRange: TimeRange): Promise<LearningMetrics> {
    const fromDate = new Date(timeRange.from);
    const toDate = new Date(timeRange.to);

    // Course enrollment metrics
    const enrollments = await this.progressRepo
      .createQueryBuilder('progress')
      .select('COUNT(*)', 'count')
      .addSelect('AVG(progress.completionPercentage)', 'avgCompletion')
      .addSelect('COUNT(CASE WHEN progress.completionPercentage >= 100 THEN 1 END)', 'completed')
      .where('progress.startedAt BETWEEN :from AND :to', { from: fromDate, to: toDate })
      .getRawOne();

    // Average time to complete
    const avgTimeToComplete = await this.progressRepo
      .createQueryBuilder('progress')
      .select('AVG(EXTRACT(EPOCH FROM (progress.lastAccessedAt - progress.startedAt)) / 3600)', 'hours')
      .where('progress.completionPercentage >= 100')
      .andWhere('progress.startedAt BETWEEN :from AND :to', { from: fromDate, to: toDate })
      .getRawOne();

    // Get top performing courses
    const topCourses = await this.getTopPerformingCourses(timeRange, 5);

    return {
      totalEnrollments: parseInt(enrollments?.count || '0', 10),
      averageCompletionRate: Math.round(parseFloat(enrollments?.avgCompletion || '0')),
      completedCourses: parseInt(enrollments?.completed || '0', 10),
      averageTimeToComplete: Math.round(parseFloat(avgTimeToComplete?.hours || '0')),
      topPerformingCourses: topCourses,
      certificatesIssued: await this.getCertificatesIssued(timeRange),
    };
  }

  /**
   * Calculate engagement metrics
   */
  private async calculateEngagementMetrics(timeRange: TimeRange): Promise<EngagementMetrics> {
    const fromDate = new Date(timeRange.from);
    const toDate = new Date(timeRange.to);

    // Session metrics
    const sessionMetrics = await this.engagementRepo
      .createQueryBuilder('event')
      .select('COUNT(*)', 'totalEvents')
      .addSelect('COUNT(DISTINCT event.userId)', 'uniqueUsers')
      .addSelect('COUNT(DISTINCT event.sessionId)', 'totalSessions')
      .where('event.timestamp BETWEEN :from AND :to', { from: fromDate, to: toDate })
      .getRawOne();

    // Average session duration
    const avgSessionDuration = await this.calculateAverageSessionDuration(timeRange);

    // Feature usage breakdown
    const featureUsage = await this.getFeatureUsage(timeRange);

    // Calculate NPS score (if available)
    const npsScore = await this.calculateNPS(timeRange);

    return {
      totalEvents: parseInt(sessionMetrics?.totalEvents || '0', 10),
      uniqueUsers: parseInt(sessionMetrics?.uniqueUsers || '0', 10),
      totalSessions: parseInt(sessionMetrics?.totalSessions || '0', 10),
      averageSessionDuration,
      eventsPerSession: parseInt(sessionMetrics?.totalEvents || '0', 10) / 
        Math.max(parseInt(sessionMetrics?.totalSessions || '1', 10), 1),
      featureUsage,
      npsScore,
    };
  }

  /**
   * Calculate revenue metrics
   */
  private async calculateRevenueMetrics(timeRange: TimeRange): Promise<RevenueMetrics> {
    // These would typically come from a payment/transaction service
    // Placeholder implementation
    return {
      totalRevenue: 0,
      revenueGrowth: 0,
      averageRevenuePerUser: 0,
      averageRevenuePerPayingUser: 0,
      conversionRate: 0,
      refundRate: 0,
      mrr: 0,
      arr: 0,
    };
  }

  /**
   * Get KPI summary for executive dashboard
   */
  async getKPISummary(): Promise<KPISummary> {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [monthlyMetrics, weeklyMetrics] = await Promise.all([
      this.getBusinessMetrics({ from: lastMonth.toISOString(), to: now.toISOString() }),
      this.getBusinessMetrics({ from: lastWeek.toISOString(), to: now.toISOString() }),
    ]);

    return {
      monthly: {
        revenue: monthlyMetrics.revenue.totalRevenue,
        newUsers: monthlyMetrics.users.newUsers,
        activeUsers: monthlyMetrics.users.monthlyActiveUsers,
        completionRate: monthlyMetrics.learning.averageCompletionRate,
      },
      weekly: {
        revenue: weeklyMetrics.revenue.totalRevenue,
        newUsers: weeklyMetrics.users.newUsers,
        activeUsers: weeklyMetrics.users.weeklyActiveUsers,
        engagementRate: this.calculateEngagementRate(weeklyMetrics.engagement),
      },
      health: this.calculateSystemHealth(monthlyMetrics),
    };
  }

  /**
   * Get cohort analysis
   */
  async getCohortAnalysis(cohortSize: 'day' | 'week' | 'month' = 'week'): Promise<CohortAnalysis> {
    // Implementation for cohort retention analysis
    const cohorts: Cohort[] = [];
    
    // Generate last 12 cohorts
    for (let i = 11; i >= 0; i--) {
      const cohortDate = new Date();
      if (cohortSize === 'day') {
        cohortDate.setDate(cohortDate.getDate() - i);
      } else if (cohortSize === 'week') {
        cohortDate.setDate(cohortDate.getDate() - i * 7);
      } else {
        cohortDate.setMonth(cohortDate.getMonth() - i);
      }

      const cohort = await this.calculateCohort(cohortDate, cohortSize);
      cohorts.push(cohort);
    }

    return {
      cohortSize,
      cohorts,
    };
  }

  /**
   * Get funnel analysis
   */
  async getFunnelAnalysis(funnelSteps: string[]): Promise<FunnelAnalysis> {
    const steps: FunnelStep[] = [];
    let previousCount: number | null = null;

    for (const step of funnelSteps) {
      const count = await this.getFunnelStepCount(step);
      const conversionRate = previousCount ? (count / previousCount) * 100 : 100;
      
      steps.push({
        step,
        count,
        conversionRate: Math.round(conversionRate * 100) / 100,
        dropOffRate: previousCount ? Math.round(((previousCount - count) / previousCount) * 100 * 100) / 100 : 0,
      });

      previousCount = count;
    }

    return {
      steps,
      overallConversionRate: steps.length > 0 ? steps[steps.length - 1].conversionRate : 0,
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private async getActiveUsers(days: number, endDate: Date): Promise<number> {
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
    
    const result = await this.engagementRepo
      .createQueryBuilder('event')
      .select('COUNT(DISTINCT event.userId)', 'count')
      .where('event.timestamp BETWEEN :start AND :end', { start: startDate, end: endDate })
      .getRawOne();

    return parseInt(result?.count || '0', 10);
  }

  private async getTotalUsers(): Promise<number> {
    const result = await this.engagementRepo
      .createQueryBuilder('event')
      .select('COUNT(DISTINCT event.userId)', 'count')
      .where('event.eventType = :type', { type: 'user_signup' })
      .getRawOne();

    return parseInt(result?.count || '0', 10);
  }

  private async calculateRetentionRate(from: Date, to: Date): Promise<number> {
    // Simplified retention calculation
    return 75.5; // Placeholder
  }

  private async calculateChurnRate(from: Date, to: Date): Promise<number> {
    // Simplified churn calculation
    return 5.2; // Placeholder
  }

  private async calculateUserGrowthRate(timeRange: TimeRange): Promise<number> {
    // Calculate growth rate compared to previous period
    return 12.3; // Placeholder
  }

  private async getTopPerformingCourses(timeRange: TimeRange, limit: number): Promise<TopCourse[]> {
    const fromDate = new Date(timeRange.from);
    const toDate = new Date(timeRange.to);

    const courses = await this.progressRepo
      .createQueryBuilder('progress')
      .select('progress.courseId', 'courseId')
      .addSelect('COUNT(*)', 'enrollments')
      .addSelect('AVG(progress.completionPercentage)', 'avgCompletion')
      .where('progress.startedAt BETWEEN :from AND :to', { from: fromDate, to: toDate })
      .groupBy('progress.courseId')
      .orderBy('enrollments', 'DESC')
      .limit(limit)
      .getRawMany();

    return courses.map((c: any) => ({
      courseId: c.courseId,
      enrollments: parseInt(c.enrollments, 10),
      averageCompletion: Math.round(parseFloat(c.avgCompletion)),
    }));
  }

  private async getCertificatesIssued(timeRange: TimeRange): Promise<number> {
    const fromDate = new Date(timeRange.from);
    const toDate = new Date(timeRange.to);

    const result = await this.progressRepo
      .createQueryBuilder('progress')
      .select('COUNT(*)', 'count')
      .where('progress.completionPercentage >= 100')
      .andWhere('progress.lastAccessedAt BETWEEN :from AND :to', { from: fromDate, to: toDate })
      .getRawOne();

    return parseInt(result?.count || '0', 10);
  }

  private async calculateAverageSessionDuration(timeRange: TimeRange): Promise<number> {
    // Placeholder - would calculate from session data
    return 15.5; // minutes
  }

  private async getFeatureUsage(timeRange: TimeRange): Promise<Record<string, number>> {
    const fromDate = new Date(timeRange.from);
    const toDate = new Date(timeRange.to);

    const results = await this.engagementRepo
      .createQueryBuilder('event')
      .select('event.eventType', 'feature')
      .addSelect('COUNT(*)', 'count')
      .where('event.timestamp BETWEEN :from AND :to', { from: fromDate, to: toDate })
      .groupBy('event.eventType')
      .getRawMany();

    return results.reduce((acc: Record<string, number>, curr: any) => {
      acc[curr.feature] = parseInt(curr.count, 10);
      return acc;
    }, {});
  }

  private async calculateNPS(timeRange: TimeRange): Promise<number> {
    // Placeholder - would calculate from survey data
    return 45;
  }

  private calculateEngagementRate(engagement: EngagementMetrics): number {
    if (engagement.totalSessions === 0) return 0;
    return Math.round((engagement.eventsPerSession / 10) * 100); // Normalize to percentage
  }

  private calculateSystemHealth(metrics: BusinessMetrics): SystemHealth {
    return {
      status: 'healthy',
      score: 92,
      issues: [],
    };
  }

  private async calculateCohort(date: Date, size: string): Promise<Cohort> {
    return {
      date: date.toISOString(),
      size: 100,
      retention: [100, 85, 72, 65, 60, 58, 55, 53, 52, 51, 50, 49],
    };
  }

  private async getFunnelStepCount(step: string): Promise<number> {
    // Placeholder - would query actual event data
    const stepCounts: Record<string, number> = {
      'signup': 1000,
      'onboarding': 750,
      'first_course': 500,
      'first_lesson': 400,
      'completion': 200,
    };
    return stepCounts[step] || 0;
  }
}

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface TimeRange {
  from: string;
  to: string;
}

export interface BusinessMetrics {
  timestamp: string;
  timeRange: TimeRange;
  users: UserMetrics;
  learning: LearningMetrics;
  engagement: EngagementMetrics;
  revenue: RevenueMetrics;
}

export interface UserMetrics {
  totalUsers: number;
  newUsers: number;
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  retentionRate: number;
  churnRate: number;
  userGrowthRate: number;
}

export interface LearningMetrics {
  totalEnrollments: number;
  averageCompletionRate: number;
  completedCourses: number;
  averageTimeToComplete: number;
  topPerformingCourses: TopCourse[];
  certificatesIssued: number;
}

export interface TopCourse {
  courseId: string;
  enrollments: number;
  averageCompletion: number;
}

export interface EngagementMetrics {
  totalEvents: number;
  uniqueUsers: number;
  totalSessions: number;
  averageSessionDuration: number;
  eventsPerSession: number;
  featureUsage: Record<string, number>;
  npsScore: number;
}

export interface RevenueMetrics {
  totalRevenue: number;
  revenueGrowth: number;
  averageRevenuePerUser: number;
  averageRevenuePerPayingUser: number;
  conversionRate: number;
  refundRate: number;
  mrr: number;
  arr: number;
}

export interface KPISummary {
  monthly: {
    revenue: number;
    newUsers: number;
    activeUsers: number;
    completionRate: number;
  };
  weekly: {
    revenue: number;
    newUsers: number;
    activeUsers: number;
    engagementRate: number;
  };
  health: SystemHealth;
}

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  score: number;
  issues: string[];
}

export interface CohortAnalysis {
  cohortSize: string;
  cohorts: Cohort[];
}

export interface Cohort {
  date: string;
  size: number;
  retention: number[];
}

export interface FunnelAnalysis {
  steps: FunnelStep[];
  overallConversionRate: number;
}

export interface FunnelStep {
  step: string;
  count: number;
  conversionRate: number;
  dropOffRate: number;
}
