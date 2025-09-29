import type { Course } from "../../courses/entities/course.entity"
import type { CourseCompletionPrediction } from "../entities/course-completion-prediction.entity"

export interface CoursePerformanceMetrics {
  totalEnrollments: number
  totalCompletions: number
  completionRate: number // Percentage
  averageProgress: number
  averageTimeSpent: number // In minutes
  dropOffRate: number
  activeUsers: number
  topLessons: { lessonTitle: string; views: number; avgTime: number }[]
  enrollmentTrend: { date: string; count: number }[]
  completionTrend: { date: string; count: number }[]
}

export interface UserEngagementMetrics {
  totalCoursesEnrolled: number
  totalCoursesCompleted: number
  averageCompletionRate: number
  averageTimeSpentPerCourse: number
  activeDays: number
  mostActiveCourses: Course[]
  recentActivities: { type: string; courseTitle: string; timestamp: Date }[]
}

export interface InstructorPerformanceMetrics {
  totalCourses: number
  averageCourseRating: number
  totalEnrollmentsAcrossCourses: number
  totalCompletionsAcrossCourses: number
  averageCompletionRate: number
  topPerformingCourses: Course[]
  studentFeedbackSummary: { positive: number; negative: number; neutral: number }
}

export interface PredictiveAnalyticsResult {
  prediction: CourseCompletionPrediction
  recommendations: string[]
}

export interface RealtimeDashboardData {
  activeUsersNow: number
  coursesBeingViewed: { courseId: string; title: string; viewers: number }[]
  recentEnrollments: { userId: string; courseId: string; timestamp: Date }[]
  recentCompletions: { userId: string; courseId: string; timestamp: Date }[]
  overallActivityRate: number // e.g., requests per second
}

export enum ReportType {
  COURSE_PERFORMANCE = "CoursePerformance",
  USER_ENGAGEMENT = "UserEngagement",
  INSTRUCTOR_PERFORMANCE = "InstructorPerformance",
  PREDICTIVE_SUMMARY = "PredictiveSummary",
  PLATFORM_OVERVIEW = "PlatformOverview",
}

export enum ReportFormat {
  EXCEL = "excel",
  CSV = "csv",
  PDF = "pdf",
  JSON = "json",
}

export interface GeneratedReport {
  jobId: string
  status: string
  downloadUrl?: string
  message?: string
}
