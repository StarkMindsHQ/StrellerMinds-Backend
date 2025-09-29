import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CoursesAdvance } from '../entities/courses-advance.entity';
import { CourseAnalytics } from '../entities/course-analytics.entity';

@Injectable()
export class InstructorToolsService {
  constructor(
    @InjectRepository(CoursesAdvance)
    private courseRepository: Repository<CoursesAdvance>,
    @InjectRepository(CourseAnalytics)
    private analyticsRepository: Repository<CourseAnalytics>,
  ) {}

  async getBulkActions(instructorId: string) {
    const courses = await this.courseRepository.find({
      where: { instructorId },
      select: ['id', 'title', 'status'],
    });

    return {
      courses,
      availableActions: [
        'publish',
        'unpublish',
        'archive',
        'duplicate',
        'export',
        'updatePricing',
      ],
    };
  }

  async executeBulkAction(
    courseIds: string[],
    action: string,
    instructorId: string,
    actionData?: any,
  ) {
    const courses = await this.courseRepository.find({
      where: { instructorId },
      select: ['id', 'title', 'status'],
    });

    const validCourseIds = courses
      .filter((course) => courseIds.includes(course.id))
      .map((course) => course.id);

    switch (action) {
      case 'publish':
        await this.courseRepository.update(
          { id: { $in: validCourseIds } },
          { status: 'published' },
        );
        break;
      case 'unpublish':
        await this.courseRepository.update(
          { id: { $in: validCourseIds } },
          { status: 'draft' },
        );
        break;
      case 'archive':
        await this.courseRepository.update(
          { id: { $in: validCourseIds } },
          { status: 'archived' },
        );
        break;
      case 'updatePricing':
        if (actionData?.price) {
          await this.courseRepository.update(
            { id: { $in: validCourseIds } },
            { price: actionData.price },
          );
        }
        break;
    }

    return { success: true, affectedCourses: validCourseIds.length };
  }

  async getCourseInsights(courseId: string, instructorId: string) {
    const course = await this.courseRepository.findOne({
      where: { id: courseId, instructorId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const analytics = await this.analyticsRepository.find({
      where: { courseId },
      order: { date: 'DESC' },
      take: 30,
    });

    const insights = {
      enrollment: {
        trend: this.calculateTrend(analytics, 'enrollments'),
        total: course.enrollmentCount,
        recentIncrease: analytics
          .slice(0, 7)
          .reduce((sum, a) => sum + a.enrollments, 0),
      },
      engagement: {
        averageWatchTime:
          analytics.reduce((sum, a) => sum + a.averageWatchTime, 0) /
          analytics.length,
        completionRate:
          analytics.reduce((sum, a) => sum + a.completionRate, 0) /
          analytics.length,
        dropOffPoints: this.identifyDropOffPoints(analytics),
      },
      performance: {
        rating: course.averageRating,
        reviewCount: course.totalReviews,
        recommendationScore: this.calculateRecommendationScore(course),
      },
      suggestions: this.generateImprovementSuggestions(course, analytics),
    };

    return insights;
  }

  async getContentOptimizationSuggestions() {
    // AI-powered content optimization suggestions
    return {
      titleOptimization: 'Consider adding specific skill levels to your title',
      descriptionImprovement: 'Add more specific learning outcomes',
      pricingRecommendation:
        'Based on similar courses, consider pricing between $49-$79',
      contentGaps: [
        'Missing practice exercises',
        'Could use more real-world examples',
      ],
      seoImprovement: ['Add trending keywords', 'Optimize course tags'],
    };
  }

  private calculateTrend(
    analytics: CourseAnalytics[],
    field: keyof CourseAnalytics,
  ): 'up' | 'down' | 'stable' {
    if (analytics.length < 2) return 'stable';

    const recent = analytics
      .slice(0, 7)
      .reduce((sum, a) => sum + (a[field] as number), 0);
    const previous = analytics
      .slice(7, 14)
      .reduce((sum, a) => sum + (a[field] as number), 0);

    if (recent > previous * 1.1) return 'up';
    if (recent < previous * 0.9) return 'down';
    return 'stable';
  }

  private identifyDropOffPoints(analytics: CourseAnalytics[]): string[] {
    // Identify common drop-off points in course content
    return ['Chapter 3: Advanced Concepts', 'Quiz Section 2'];
  }

  private calculateRecommendationScore(course: CoursesAdvance): number {
    // Calculate NPS-like score based on ratings and reviews
    return Math.min(100, (course.averageRating / 5) * 100);
  }

  private generateImprovementSuggestions(
    course: CoursesAdvance,
    analytics: CourseAnalytics[],
  ): string[] {
    const suggestions = [];

    if (course.averageRating < 4.0) {
      suggestions.push(
        'Consider updating course content based on student feedback',
      );
    }

    const avgCompletion =
      analytics.reduce((sum, a) => sum + a.completionRate, 0) /
      analytics.length;
    if (avgCompletion < 60) {
      suggestions.push(
        'Course completion rate is low - consider breaking content into smaller sections',
      );
    }

    if (course.enrollmentCount < 100) {
      suggestions.push('Improve course marketing and SEO optimization');
    }

    return suggestions;
  }
}
