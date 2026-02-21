import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ProfileAnalytics } from '../../user/entities/profile-analytics.entity';
import { FinancialReport } from '../../payment/entities/financial-report.entity';
import { UserActivity } from '../../user/entities/user-activity.entity';
import { Payment } from '../../payment/entities/payment.entity';
import { User } from '../../auth/entities/user.entity';
import { ReportType } from '../entities/analytics-report.entity';

@Injectable()
export class DataAggregationService {
  constructor(
    @InjectRepository(ProfileAnalytics)
    private profileAnalyticsRepo: Repository<ProfileAnalytics>,
    @InjectRepository(FinancialReport)
    private financialReportRepo: Repository<FinancialReport>,
    @InjectRepository(UserActivity)
    private userActivityRepo: Repository<UserActivity>,
    @InjectRepository(Payment)
    private paymentRepo: Repository<Payment>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async aggregateData(reportType: ReportType, configuration: any): Promise<any> {
    const { dateRange, metrics, dimensions, filters } = configuration;
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);

    switch (reportType) {
      case ReportType.USER_ENGAGEMENT:
        return this.aggregateUserEngagement(startDate, endDate, metrics, dimensions, filters);
      case ReportType.FINANCIAL:
        return this.aggregateFinancialData(startDate, endDate, metrics, dimensions, filters);
      case ReportType.COURSE_PERFORMANCE:
        return this.aggregateCoursePerformance(startDate, endDate, metrics, dimensions, filters);
      case ReportType.SYSTEM_HEALTH:
        return this.aggregateSystemHealth(startDate, endDate, metrics, dimensions, filters);
      default:
        return this.aggregateCustomData(startDate, endDate, metrics, dimensions, filters);
    }
  }

  private async aggregateUserEngagement(
    startDate: Date,
    endDate: Date,
    metrics: string[],
    dimensions: string[],
    filters: any,
  ): Promise<any> {
    const activities = await this.userActivityRepo.find({
      where: {
        createdAt: Between(startDate, endDate),
      },
      relations: ['user'],
    });

    const profileAnalytics = await this.profileAnalyticsRepo.find({
      relations: ['profile'],
    });

    const totalUsers = await this.userRepo.count();
    const activeUsers = new Set(activities.map(a => a.userId)).size;

    const activityByType = activities.reduce((acc, activity) => {
      acc[activity.type] = (acc[activity.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalViews = profileAnalytics.reduce((sum, pa) => sum + pa.totalViews, 0);
    const avgSessionDuration = profileAnalytics.length > 0
      ? profileAnalytics.reduce((sum, pa) => sum + (pa.averageSessionDuration || 0), 0) / profileAnalytics.length
      : 0;

    return {
      summary: {
        totalUsers,
        activeUsers,
        engagementRate: (activeUsers / totalUsers) * 100,
        totalActivities: activities.length,
        totalProfileViews: totalViews,
        avgSessionDuration,
      },
      activityBreakdown: activityByType,
      timeSeriesData: this.groupByDate(activities, startDate, endDate),
      topEngagedUsers: await this.getTopEngagedUsers(startDate, endDate),
    };
  }

  private async aggregateFinancialData(
    startDate: Date,
    endDate: Date,
    metrics: string[],
    dimensions: string[],
    filters: any,
  ): Promise<any> {
    const payments = await this.paymentRepo.find({
      where: {
        createdAt: Between(startDate, endDate),
      },
    });

    const financialReports = await this.financialReportRepo.find({
      where: {
        startDate: Between(startDate, endDate),
      },
    });

    const totalRevenue = payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);

    const totalRefunds = payments
      .filter(p => p.status === 'refunded')
      .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);

    const transactionCount = payments.length;
    const avgTransactionValue = totalRevenue / transactionCount;

    return {
      summary: {
        totalRevenue,
        totalRefunds,
        netRevenue: totalRevenue - totalRefunds,
        transactionCount,
        avgTransactionValue,
      },
      revenueByGateway: this.groupByField(payments, 'gateway'),
      revenueByStatus: this.groupByField(payments, 'status'),
      timeSeriesData: this.groupByDate(payments, startDate, endDate),
      financialReports: financialReports.map(fr => ({
        period: fr.period,
        totalRevenue: fr.totalRevenue,
        netRevenue: fr.netRevenue,
        transactionCount: fr.transactionCount,
      })),
    };
  }

  private async aggregateCoursePerformance(
    startDate: Date,
    endDate: Date,
    metrics: string[],
    dimensions: string[],
    filters: any,
  ): Promise<any> {
    // Placeholder for course performance aggregation
    return {
      summary: {
        totalCourses: 0,
        totalEnrollments: 0,
        completionRate: 0,
        avgRating: 0,
      },
      topCourses: [],
      enrollmentTrends: [],
    };
  }

  private async aggregateSystemHealth(
    startDate: Date,
    endDate: Date,
    metrics: string[],
    dimensions: string[],
    filters: any,
  ): Promise<any> {
    const activities = await this.userActivityRepo.find({
      where: {
        createdAt: Between(startDate, endDate),
      },
    });

    return {
      summary: {
        totalRequests: activities.length,
        errorRate: 0,
        avgResponseTime: 0,
        uptime: 99.9,
      },
      requestsByEndpoint: {},
      errorsByType: {},
    };
  }

  private async aggregateCustomData(
    startDate: Date,
    endDate: Date,
    metrics: string[],
    dimensions: string[],
    filters: any,
  ): Promise<any> {
    return {
      summary: {},
      data: [],
    };
  }

  private groupByDate(items: any[], startDate: Date, endDate: Date): any[] {
    const grouped = items.reduce((acc, item) => {
      const date = new Date(item.createdAt).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(item);
      return acc;
    }, {} as Record<string, any[]>);

    return Object.entries(grouped).map(([date, dateItems]: [string, any[]]) => ({
      date,
      count: dateItems.length,
    }));
  }

  private groupByField(items: any[], field: string): Record<string, number> {
    return items.reduce((acc, item) => {
      const key = item[field] || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private async getTopEngagedUsers(startDate: Date, endDate: Date, limit: number = 10): Promise<any[]> {
    const activities = await this.userActivityRepo
      .createQueryBuilder('activity')
      .select('activity.userId', 'userId')
      .addSelect('COUNT(*)', 'activityCount')
      .where('activity.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('activity.userId')
      .orderBy('activityCount', 'DESC')
      .limit(limit)
      .getRawMany();

    return activities;
  }
}
