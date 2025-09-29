import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseAnalytics } from '../entities/course-analytics.entity';
import { CoursePerformance } from '../entities/course-performance.entity';
import { AnalyticsQueryDto } from '../dto/course-analytics.dto';

@Injectable()
export class CourseAnalyticsService {
  constructor(
    @InjectRepository(CourseAnalytics)
    private analyticsRepository: Repository<CourseAnalytics>,
    @InjectRepository(CoursePerformance)
    private performanceRepository: Repository<CoursePerformance>,
  ) {}

  async getCourseAnalytics(courseId: string, queryDto: AnalyticsQueryDto) {
    const { startDate, endDate, groupBy = 'day' } = queryDto;

    let query = this.analyticsRepository
      .createQueryBuilder('analytics')
      .where('analytics.courseId = :courseId', { courseId });

    if (startDate && endDate) {
      query = query.andWhere('analytics.date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const analytics = await query.orderBy('analytics.date', 'ASC').getMany();

    return this.groupAnalyticsData(analytics, groupBy);
  }

  async getCoursePerformance(courseId: string) {
    return this.performanceRepository.findOne({
      where: { courseId },
      order: { createdAt: 'DESC' },
    });
  }

  async getInstructorDashboard(instructorId: string) {
    const analytics = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .leftJoin('analytics.course', 'course')
      .where('course.instructorId = :instructorId', { instructorId })
      .select([
        'SUM(analytics.views) as totalViews',
        'SUM(analytics.enrollments) as totalEnrollments',
        'AVG(analytics.completionRate) as avgCompletionRate',
        'COUNT(DISTINCT analytics.courseId) as totalCourses',
      ])
      .getRawOne();

    const performance = await this.performanceRepository
      .createQueryBuilder('performance')
      .leftJoin('performance.course', 'course')
      .where('course.instructorId = :instructorId', { instructorId })
      .select([
        'SUM(performance.revenue) as totalRevenue',
        'SUM(performance.totalStudents) as totalStudents',
        'AVG(performance.satisfactionScore) as avgSatisfaction',
      ])
      .getRawOne();

    return {
      ...analytics,
      ...performance,
    };
  }

  async trackCourseView(courseId: string) {
    const today = new Date().toISOString().split('T')[0];

    let analytics = await this.analyticsRepository.findOne({
      where: { courseId, date: new Date(today) },
    });

    if (!analytics) {
      analytics = this.analyticsRepository.create({
        courseId,
        date: new Date(today),
        views: 1,
      });
    } else {
      analytics.views += 1;
    }

    await this.analyticsRepository.save(analytics);
  }

  async trackEnrollment(courseId: string) {
    const today = new Date().toISOString().split('T')[0];

    let analytics = await this.analyticsRepository.findOne({
      where: { courseId, date: new Date(today) },
    });

    if (!analytics) {
      analytics = this.analyticsRepository.create({
        courseId,
        date: new Date(today),
        enrollments: 1,
      });
    } else {
      analytics.enrollments += 1;
    }

    await this.analyticsRepository.save(analytics);
  }

  private groupAnalyticsData(analytics: CourseAnalytics[], groupBy: string) {
    // Implementation for grouping data by day/week/month
    const grouped = {};

    analytics.forEach((item) => {
      let key: string;
      const date = new Date(item.date);

      switch (groupBy) {
        case 'week':
          const weekStart = new Date(
            date.setDate(date.getDate() - date.getDay()),
          );
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          key = item.date.toISOString().split('T')[0];
      }

      if (!grouped[key]) {
        grouped[key] = {
          date: key,
          views: 0,
          enrollments: 0,
          completions: 0,
          averageWatchTime: 0,
          count: 0,
        };
      }

      grouped[key].views += item.views;
      grouped[key].enrollments += item.enrollments;
      grouped[key].completions += item.completions;
      grouped[key].averageWatchTime += item.averageWatchTime;
      grouped[key].count += 1;
    });

    // Calculate averages
    Object.values(grouped).forEach((group: any) => {
      group.averageWatchTime = group.averageWatchTime / group.count;
    });

    return Object.values(grouped);
  }
}
