import { Injectable, BadRequestException } from "@nestjs/common";
import type { Repository } from "typeorm";
import type { UserEngagement, EngagementType } from "./entities/user-engagement.entity";
import { type CourseCompletion, CompletionStatus } from "./entities/course-completion.entity";
import type { User } from "../users/entities/user.entity";
import type { Course } from "../courses/entities/course.entity";
import { type AnalyticsQueryDto, type ExportQueryDto, TimeRange, ExportFormat } from "./dto/analytics-query.dto";
import type {
  AnalyticsDashboardResponse,
  UserEngagementMetrics,
  CourseCompletionMetrics,
} from "./dto/analytics-response.dto";

/**
 * AnalyticsService provides logic for analytics dashboard, export, and engagement tracking.
 */
@Injectable()
export class AnalyticsService {
  constructor(
    private userEngagementRepository: Repository<UserEngagement>,
    private courseCompletionRepository: Repository<CourseCompletion>,
    private userRepository: Repository<User>,
    private courseRepository: Repository<Course>,
  ) {}

  /**
   * Get analytics dashboard data for the given query and user context.
   * @param query - Analytics query parameters
   * @param userRole - Role of the requesting user
   * @param userId - ID of the requesting user (optional)
   * @returns Analytics dashboard response
   */
  async getDashboardAnalytics(
    query: AnalyticsQueryDto,
    userRole: string,
    userId?: string,
  ): Promise<AnalyticsDashboardResponse> {
    const { startDate, endDate } = this.getDateRange(query);

    // Apply authorization filters
    const courseFilter = await this.buildCourseFilter(query, userRole, userId);

    const [userEngagement, courseCompletion] = await Promise.all([
      this.getUserEngagementMetrics(startDate, endDate, courseFilter),
      this.getCourseCompletionMetrics(startDate, endDate, courseFilter),
    ]);

    return {
      userEngagement,
      courseCompletion,
      timeRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get user engagement metrics for the dashboard.
   * @param startDate - Start date of the query
   * @param endDate - End date of the query
   * @param courseFilter - Filter for courses
   * @returns User engagement metrics
   */
  private async getUserEngagementMetrics(
    startDate: Date,
    endDate: Date,
    courseFilter: string[],
  ): Promise<UserEngagementMetrics> {
    const baseQuery = this.userEngagementRepository
      .createQueryBuilder("engagement")
      .where("engagement.createdAt BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      });

    if (courseFilter.length > 0) {
      baseQuery.andWhere("engagement.courseId IN (:...courseIds)", {
        courseIds: courseFilter,
      });
    }

    // Total and active users
    const [totalUsers, activeUsers] = await Promise.all([
      this.userRepository.count(),
      baseQuery
        .select("COUNT(DISTINCT engagement.userId)", "count")
        .getRawOne()
        .then((result) => Number.parseInt(result.count)),
    ]);

    // New users in period
    const newUsers = await this.userRepository
      .createQueryBuilder("user")
      .where("user.createdAt BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      })
      .getCount();

    // Session metrics
    const sessionMetrics = await baseQuery
      .select(["COUNT(*) as totalSessions", "AVG(engagement.duration) as avgDuration"])
      .getRawOne();

    // Engagement by type
    const engagementByType = await baseQuery
      .select(["engagement.engagementType as type", "COUNT(*) as count"])
      .groupBy("engagement.engagementType")
      .getRawMany();

    const engagementTypeMap = engagementByType.reduce((acc, item) => {
      acc[item.type] = Number.parseInt(item.count);
      return acc;
    }, {});

    return {
      totalUsers,
      activeUsers,
      newUsers,
      averageSessionDuration: Math.round(sessionMetrics.avgDuration || 0),
      totalSessions: Number.parseInt(sessionMetrics.totalSessions || "0"),
      engagementByType: engagementTypeMap,
    };
  }

  /**
   * Get course completion metrics for the dashboard.
   * @param startDate - Start date of the query
   * @param endDate - End date of the query
   * @param courseFilter - Filter for courses
   * @returns Course completion metrics
   */
  private async getCourseCompletionMetrics(
    startDate: Date,
    endDate: Date,
    courseFilter: string[],
  ): Promise<CourseCompletionMetrics> {
    const baseQuery = this.courseCompletionRepository
      .createQueryBuilder("completion")
      .leftJoin("completion.course", "course")
      .where("completion.createdAt BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      });

    if (courseFilter.length > 0) {
      baseQuery.andWhere("completion.courseId IN (:...courseIds)", {
        courseIds: courseFilter,
      });
    }

    // Overall completion metrics
    const completionStats = await baseQuery
      .select([
        "COUNT(*) as totalEnrollments",
        `SUM(CASE WHEN completion.status = '${CompletionStatus.COMPLETED}' THEN 1 ELSE 0 END) as completedCourses`,
        `SUM(CASE WHEN completion.status = '${CompletionStatus.IN_PROGRESS}' THEN 1 ELSE 0 END) as inProgressCourses`,
        `SUM(CASE WHEN completion.status = '${CompletionStatus.DROPPED}' THEN 1 ELSE 0 END) as droppedCourses`,
        "AVG(completion.progressPercentage) as avgCompletionRate",
      ])
      .getRawOne();

    // Average time to complete
    const avgTimeToComplete = await this.courseCompletionRepository
      .createQueryBuilder("completion")
      .select("AVG(completion.timeSpent) as avgTime")
      .where("completion.status = :status", { status: CompletionStatus.COMPLETED })
      .andWhere("completion.completedAt BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      })
      .getRawOne();

    // Course-specific completion rates
    const courseCompletionRates = await baseQuery
      .select([
        "completion.courseId as courseId",
        "course.title as courseName",
        "COUNT(*) as totalEnrollments",
        `SUM(CASE WHEN completion.status = '${CompletionStatus.COMPLETED}' THEN 1 ELSE 0 END) as completed`,
        `ROUND((SUM(CASE WHEN completion.status = '${CompletionStatus.COMPLETED}' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2) as completionRate`,
      ])
      .groupBy("completion.courseId, course.title")
      .orderBy("completionRate", "DESC")
      .limit(10)
      .getRawMany();

    return {
      totalEnrollments: Number.parseInt(completionStats.totalEnrollments || "0"),
      completedCourses: Number.parseInt(completionStats.completedCourses || "0"),
      inProgressCourses: Number.parseInt(completionStats.inProgressCourses || "0"),
      droppedCourses: Number.parseInt(completionStats.droppedCourses || "0"),
      averageCompletionRate: Number.parseFloat(completionStats.avgCompletionRate || "0"),
      averageTimeToComplete: Math.round(avgTimeToComplete?.avgTime || 0),
      courseCompletionRates: courseCompletionRates.map((item) => ({
        courseId: item.courseId,
        courseName: item.courseName,
        completionRate: Number.parseFloat(item.completionRate),
        totalEnrollments: Number.parseInt(item.totalEnrollments),
      })),
    };
  }

  /**
   * Export analytics data in the requested format.
   * @param query - Export query parameters
   * @param userRole - Role of the requesting user
   * @param userId - ID of the requesting user (optional)
   * @returns Exported analytics data
   */
  async exportAnalytics(query: ExportQueryDto, userRole: string, userId?: string): Promise<any> {
    const dashboardData = await this.getDashboardAnalytics(query, userRole, userId);

    switch (query.format) {
      case ExportFormat.CSV:
        return this.convertToCSV(dashboardData);
      case ExportFormat.EXCEL:
        return this.convertToExcel(dashboardData);
      default:
        return dashboardData;
    }
  }

  /**
   * Track a user engagement event.
   * @param userId - ID of the user
   * @param engagementType - Type of engagement
   * @param courseId - ID of the course (optional)
   * @param metadata - Additional metadata for the engagement (optional)
   * @param duration - Duration of the engagement in minutes (optional, default is 1)
   * @returns Promise<UserEngagement>
   */
  async trackUserEngagement(
    userId: string,
    engagementType: EngagementType,
    courseId?: string,
    metadata?: Record<string, any>,
    duration = 1,
  ): Promise<UserEngagement> {
    const engagement = this.userEngagementRepository.create({
      userId,
      courseId,
      engagementType,
      metadata,
      duration,
    });

    return this.userEngagementRepository.save(engagement);
  }

  /**
   * Update the progress of a course for a user.
   * @param userId - ID of the user
   * @param courseId - ID of the course
   * @param progressData - Progress data to update
   * @returns Promise<CourseCompletion>
   */
  async updateCourseProgress(
    userId: string,
    courseId: string,
    progressData: {
      progressPercentage?: number;
      lessonsCompleted?: number;
      totalLessons?: number;
      timeSpent?: number;
      status?: CompletionStatus;
    },
  ): Promise<CourseCompletion> {
    let completion = await this.courseCompletionRepository.findOne({
      where: { userId, courseId },
    });

    if (!completion) {
      completion = this.courseCompletionRepository.create({
        userId,
        courseId,
        status: CompletionStatus.NOT_STARTED,
      });
    }

    // Update fields
    Object.assign(completion, progressData);

    // Set timestamps
    if (progressData.status === CompletionStatus.IN_PROGRESS && !completion.startedAt) {
      completion.startedAt = new Date();
    }

    if (progressData.status === CompletionStatus.COMPLETED && !completion.completedAt) {
      completion.completedAt = new Date();
    }

    return this.courseCompletionRepository.save(completion);
  }

  /**
   * Get the date range for the analytics query.
   * @param query - Analytics query parameters
   * @returns Object containing startDate and endDate
   */
  private getDateRange(query: AnalyticsQueryDto): { startDate: Date; endDate: Date } {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    if (query.timeRange === TimeRange.CUSTOM) {
      if (!query.startDate || !query.endDate) {
        throw new BadRequestException("Start date and end date are required for custom time range");
      }
      startDate = new Date(query.startDate);
      endDate = new Date(query.endDate);
    } else {
      switch (query.timeRange) {
        case TimeRange.LAST_7_DAYS:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case TimeRange.LAST_30_DAYS:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case TimeRange.LAST_90_DAYS:
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case TimeRange.LAST_YEAR:
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
    }

    return { startDate, endDate };
  }

  /**
   * Build the course filter based on the query and user context.
   * @param query - Analytics query parameters
   * @param userRole - Role of the requesting user
   * @param userId - ID of the requesting user (optional)
   * @returns Array of course IDs that the user has access to
   */
  private async buildCourseFilter(query: AnalyticsQueryDto, userRole: string, userId?: string): Promise<string[]> {
    let courseIds: string[] = [];

    if (query.courseId) {
      courseIds = [query.courseId];
    } else if (userRole === "instructor" && userId) {
      // Instructors can only see their own courses
      const instructorCourses = await this.courseRepository.find({
        where: { instructor: { id: userId } },
        select: ["id"],
      });
      courseIds = instructorCourses.map((course) => course.id);
    } else if (query.instructorId) {
      // Admin can filter by instructor
      const instructorCourses = await this.courseRepository.find({
        where: { instructor: { id: query.instructorId } },
        select: ["id"],
      });
      courseIds = instructorCourses.map((course) => course.id);
    }

    return courseIds;
  }

  /**
   * Convert the analytics data to CSV format.
   * @param data - Analytics data to convert
   * @returns CSV string
   */
  private convertToCSV(data: AnalyticsDashboardResponse): string {
    const csvRows: string[] = [];

    // User Engagement CSV
    csvRows.push("User Engagement Metrics");
    csvRows.push("Metric,Value");
    csvRows.push(`Total Users,${data.userEngagement.totalUsers}`);
    csvRows.push(`Active Users,${data.userEngagement.activeUsers}`);
    csvRows.push(`New Users,${data.userEngagement.newUsers}`);
    csvRows.push(`Average Session Duration,${data.userEngagement.averageSessionDuration}`);
    csvRows.push(`Total Sessions,${data.userEngagement.totalSessions}`);
    csvRows.push("");

    // Course Completion CSV
    csvRows.push("Course Completion Metrics");
    csvRows.push("Metric,Value");
    csvRows.push(`Total Enrollments,${data.courseCompletion.totalEnrollments}`);
    csvRows.push(`Completed Courses,${data.courseCompletion.completedCourses}`);
    csvRows.push(`In Progress Courses,${data.courseCompletion.inProgressCourses}`);
    csvRows.push(`Dropped Courses,${data.courseCompletion.droppedCourses}`);
    csvRows.push(`Average Completion Rate,${data.courseCompletion.averageCompletionRate}%`);

    return csvRows.join("\n");
  }

  /**
   * Convert the analytics data to Excel format.
   * @param data - Analytics data to convert
   * @returns Structured data for Excel conversion
   */
  private convertToExcel(data: AnalyticsDashboardResponse): any {
    // This would typically use a library like 'exceljs' or 'xlsx'
    // For now, returning structured data that can be converted to Excel
    return {
      worksheets: [
        {
          name: "User Engagement",
          data: [
            ["Metric", "Value"],
            ["Total Users", data.userEngagement.totalUsers],
            ["Active Users", data.userEngagement.activeUsers],
            ["New Users", data.userEngagement.newUsers],
            ["Average Session Duration", data.userEngagement.averageSessionDuration],
            ["Total Sessions", data.userEngagement.totalSessions],
          ],
        },
        {
          name: "Course Completion",
          data: [
            ["Metric", "Value"],
            ["Total Enrollments", data.courseCompletion.totalEnrollments],
            ["Completed Courses", data.courseCompletion.completedCourses],
            ["In Progress Courses", data.courseCompletion.inProgressCourses],
            ["Dropped Courses", data.courseCompletion.droppedCourses],
            ["Average Completion Rate", `${data.courseCompletion.averageCompletionRate}%`],
          ],
        },
      ],
    };
  }
}
