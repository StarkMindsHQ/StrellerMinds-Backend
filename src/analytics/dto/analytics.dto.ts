import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsObject,
  IsDateString,
  ValidateNested,
  IsUUID,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ReportType } from '../entities/analytics-report.entity';
import { AggregationPeriod } from '../entities/analytics-aggregation.entity';

export class DateRangeDto {
  @ApiProperty()
  @IsDateString()
  start: string;

  @ApiProperty()
  @IsDateString()
  end: string;
}

export class ReportConfigurationDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  metrics: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  dimensions: string[];

  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  @IsOptional()
  filters?: Record<string, any>;

  @ApiProperty({ type: DateRangeDto })
  @ValidateNested()
  @Type(() => DateRangeDto)
  dateRange: DateRangeDto;

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  groupBy?: string[];

  @ApiProperty({ type: 'array', isArray: true })
  @IsArray()
  @IsOptional()
  orderBy?: { field: string; direction: 'ASC' | 'DESC' }[];
}

export class CreateReportDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: ReportType })
  @IsEnum(ReportType)
  reportType: ReportType;

  @ApiProperty({ type: ReportConfigurationDto })
  @ValidateNested()
  @Type(() => ReportConfigurationDto)
  configuration: ReportConfigurationDto;
}

export class ExportReportDto {
  @ApiProperty({ enum: ['csv', 'xlsx', 'pdf', 'json'] })
  @IsEnum(['csv', 'xlsx', 'pdf', 'json'])
  format: 'csv' | 'json' | 'xlsx' | 'pdf';
}

export class DashboardQueryDto {
  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  metric?: string;
}

export class TrackEventDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  @IsOptional()
  courseId?: string;

  @IsUUID()
  @IsOptional()
  lessonId?: string;

  @IsUUID()
  @IsOptional()
  moduleId?: string;

  @IsString()
  eventType: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  durationSeconds?: number;

  @IsOptional()
  metadata?: Record<string, any>;

  @IsString()
  @IsOptional()
  sessionId?: string;

  @IsString()
  @IsOptional()
  deviceType?: string;
}

export class AnalyticsQueryDto {
  @IsUUID()
  @IsOptional()
  courseId?: string;

  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsEnum(AggregationPeriod)
  @IsOptional()
  period?: AggregationPeriod;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;

  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;
}

export class ExportAnalyticsDto {
  @IsUUID()
  @IsOptional()
  courseId?: string;

  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsEnum(['csv', 'json', 'xlsx'])
  format: 'csv' | 'json' | 'xlsx';

  @IsEnum(['progress', 'engagement', 'at_risk', 'instructor_summary'])
  reportType: 'progress' | 'engagement' | 'at_risk' | 'instructor_summary';
}

// ─── Response shapes ──────────────────────────────────────────────────────────

export interface CourseAnalyticsResponse {
  courseId: string;
  totalEnrolled: number;
  activeStudents: number;
  completionRate: number;
  averageProgress: number;
  averageTimeSpentHours: number;
  averageQuizScore: number;
  dropoutRate: number;
  atRiskCount: number;
  engagementScore: number;
  progressDistribution: Record<string, number>;
  weeklyActivity: Array<{ week: string; activeUsers: number; completions: number }>;
  topLessons: Array<{ lessonId: string; views: number; avgDuration: number }>;
}

export interface StudentAnalyticsResponse {
  userId: string;
  totalCoursesEnrolled: number;
  coursesCompleted: number;
  totalTimeSpentHours: number;
  overallCompletionRate: number;
  averageQuizScore: number;
  currentStreak: number;
  longestStreak: number;
  weeklyActivityHours: Array<{ week: string; hours: number }>;
  courseBreakdown: Array<{
    courseId: string;
    progress: number;
    timeSpentHours: number;
    status: string;
  }>;
  learningPattern: {
    mostActiveHour: number;
    mostActiveDayOfWeek: number;
    averageSessionMinutes: number;
    preferredDevice: string;
  };
}

export interface InstructorDashboardResponse {
  instructorId: string;
  totalStudents: number;
  totalCourses: number;
  averageCourseCompletionRate: number;
  atRiskStudents: number;
  recentActivity: Array<{ date: string; activeStudents: number }>;
  coursePerformance: CourseAnalyticsResponse[];
  topPerformingStudents: Array<{ userId: string; completionRate: number; avgScore: number }>;
  studentsNeedingAttention: Array<{
    userId: string;
    courseId: string;
    riskLevel: string;
    riskScore: number;
    recommendations: string[];
  }>;
}
