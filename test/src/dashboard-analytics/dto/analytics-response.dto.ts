import { ApiProperty } from "@nestjs/swagger";

/**
 * DTO for user engagement metrics in analytics dashboard.
 */
export class UserEngagementMetrics {
  /** Total number of users */
  @ApiProperty({ description: "Total number of users" })
  totalUsers: number;

  /** Number of active users */
  @ApiProperty({ description: "Number of active users" })
  activeUsers: number;

  /** Number of new users */
  @ApiProperty({ description: "Number of new users" })
  newUsers: number;

  /** Average session duration (seconds) */
  @ApiProperty({ description: "Average session duration (seconds)" })
  averageSessionDuration: number;

  /** Total number of sessions */
  @ApiProperty({ description: "Total number of sessions" })
  totalSessions: number;

  /** Engagement by type (event type to count) */
  @ApiProperty({
    description: "Engagement by type",
    type: "object",
    example: { login: 100, course_view: 50 },
  })
  engagementByType: Record<string, number>;
}

/**
 * DTO for course completion metrics in analytics dashboard.
 */
export class CourseCompletionMetrics {
  /** Total enrollments */
  @ApiProperty({ description: "Total enrollments" })
  totalEnrollments: number;

  /** Number of completed courses */
  @ApiProperty({ description: "Number of completed courses" })
  completedCourses: number;

  /** Number of in-progress courses */
  @ApiProperty({ description: "Number of in-progress courses" })
  inProgressCourses: number;

  /** Number of dropped courses */
  @ApiProperty({ description: "Number of dropped courses" })
  droppedCourses: number;

  /** Average completion rate (0-1) */
  @ApiProperty({ description: "Average completion rate (0-1)" })
  averageCompletionRate: number;

  /** Average time to complete (minutes) */
  @ApiProperty({ description: "Average time to complete (minutes)" })
  averageTimeToComplete: number;

  /** Per-course completion rates */
  @ApiProperty({
    description: "Per-course completion rates",
    type: "array",
    items: {
      type: "object",
      properties: {
        courseId: { type: "string" },
        courseName: { type: "string" },
        completionRate: { type: "number" },
        totalEnrollments: { type: "number" },
      },
    },
  })
  courseCompletionRates: Array<{
    courseId: string;
    courseName: string;
    completionRate: number;
    totalEnrollments: number;
  }>;

  /**
   * Calculate the overall course completion rate.
   * @returns Overall completion rate as a number (0-1).
   */
  getOverallCompletionRate(): number {
    if (this.totalEnrollments === 0) return 0;
    return this.completedCourses / this.totalEnrollments;
  }
}

/**
 * DTO for analytics dashboard response.
 */
export class AnalyticsDashboardResponse {
  /** User engagement metrics */
  @ApiProperty({
    type: UserEngagementMetrics,
    description: "User engagement metrics",
  })
  userEngagement: UserEngagementMetrics;

  /** Course completion metrics */
  @ApiProperty({
    type: CourseCompletionMetrics,
    description: "Course completion metrics",
  })
  courseCompletion: CourseCompletionMetrics;

  /** Time range for the analytics data */
  @ApiProperty({
    description: "Time range for the analytics data",
    example: { startDate: "2025-06-01", endDate: "2025-06-29" },
  })
  timeRange: {
    startDate: string;
    endDate: string;
  };

  /** Date/time when the analytics was generated */
  @ApiProperty({
    description: "Date/time when the analytics was generated",
    example: "2025-06-29T12:00:00Z",
  })
  generatedAt: string;
}
