import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { Cron } from '@nestjs/schedule';

import { EngagementEvent } from '../entities/engagement-event.entity';
import { AnalyticsAggregation } from '../entities/analytics-aggregation.entity';
import { AtRiskPrediction } from '../entities/at-risk-prediction.entity';
import {
  CourseAnalyticsResponse,
  StudentAnalyticsResponse,
  InstructorDashboardResponse,
} from '../dto/analytics.dto';
import { ProgressTrackingService } from '../../learning-path/services/progress-tracking.service';
import { ProgressStatus, StudentProgress } from '../entities/student.progress.entity';

const CACHE_TTL_SECONDS = 300; // 5 min

@Injectable()
export class CourseAnalyticsService {
  private readonly logger = new Logger(CourseAnalyticsService.name);

  constructor(
    @InjectRepository(StudentProgress)
    private progressRepo: Repository<StudentProgress>,

    @InjectRepository(EngagementEvent)
    private engagementRepo: Repository<EngagementEvent>,

    @InjectRepository(AnalyticsAggregation)
    private aggregationRepo: Repository<AnalyticsAggregation>,

    @InjectRepository(AtRiskPrediction)
    private atRiskRepo: Repository<AtRiskPrediction>,

    @InjectRedis()
    private redis: Redis,

    private progressTrackingService: ProgressTrackingService,
  ) {}

  // ─── Course Analytics ─────────────────────────────────────────────────────

  async getCourseAnalytics(
    courseId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<CourseAnalyticsResponse> {
    const cacheKey = `analytics:course:${courseId}:${startDate?.toISOString()}:${endDate?.toISOString()}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as CourseAnalyticsResponse;

    const start = startDate ?? new Date(Date.now() - 30 * 86_400_000);
    const end = endDate ?? new Date();

    const [summary, engagement, atRisk, weeklyActivity, topLessons] = await Promise.all([
      this.progressTrackingService.getCourseProgressSummary(courseId),
      this.getEngagementScore(courseId, start, end),
      this.atRiskRepo.count({ where: { courseId, resolved: false } }),
      this.getWeeklyActivity(courseId, start, end),
      this.getTopLessons(courseId, start, end),
    ]);

    const distribution = await this.progressRepo
      .createQueryBuilder('p')
      .where('p.courseId = :courseId', { courseId })
      .select([
        'SUM(CASE WHEN p.completionPercentage = 0 THEN 1 ELSE 0 END)::int AS "0"',
        'SUM(CASE WHEN p.completionPercentage > 0 AND p.completionPercentage <= 25 THEN 1 ELSE 0 END)::int AS "1-25"',
        'SUM(CASE WHEN p.completionPercentage > 25 AND p.completionPercentage <= 50 THEN 1 ELSE 0 END)::int AS "26-50"',
        'SUM(CASE WHEN p.completionPercentage > 50 AND p.completionPercentage <= 75 THEN 1 ELSE 0 END)::int AS "51-75"',
        'SUM(CASE WHEN p.completionPercentage > 75 AND p.completionPercentage < 100 THEN 1 ELSE 0 END)::int AS "76-99"',
        'SUM(CASE WHEN p.completionPercentage = 100 THEN 1 ELSE 0 END)::int AS "100"',
      ])
      .getRawOne();

    const result: CourseAnalyticsResponse = {
      courseId,
      totalEnrolled: summary.totalEnrolled ?? 0,
      activeStudents: engagement.activeStudents,
      completionRate:
        summary.totalEnrolled > 0
          ? Math.round((summary.completed / summary.totalEnrolled) * 10000) / 100
          : 0,
      averageProgress: summary.averageCompletion ?? 0,
      averageTimeSpentHours: summary.averageTimeSpentHours ?? 0,
      averageQuizScore: summary.averageQuizScore ?? 0,
      dropoutRate: engagement.dropoutRate,
      atRiskCount: atRisk,
      engagementScore: engagement.score,
      progressDistribution: distribution ?? {},
      weeklyActivity,
      topLessons,
    };

    await this.redis.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(result));
    return result;
  }

  // ─── Student Analytics ────────────────────────────────────────────────────

  async getStudentAnalytics(userId: string): Promise<StudentAnalyticsResponse> {
    const cacheKey = `analytics:student:${userId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as StudentAnalyticsResponse;

    const progresses = await this.progressRepo.find({ where: { userId } });

    const totalCourses = progresses.length;
    const completed = progresses.filter((p) => p.status === ProgressStatus.COMPLETED).length;
    const totalSeconds = progresses.reduce((sum, p) => sum + (p.timeSpentSeconds ?? 0), 0);
    const avgCompletion =
      totalCourses > 0
        ? progresses.reduce((sum, p) => sum + p.completionPercentage, 0) / totalCourses
        : 0;
    const scores = progresses
      .filter((p) => p.averageQuizScore != null)
      .map((p) => p.averageQuizScore);
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const maxStreak = Math.max(0, ...progresses.map((p) => p.streakDays));

    const [weeklyActivity, learningPattern] = await Promise.all([
      this.getStudentWeeklyActivity(userId),
      this.getLearningPattern(userId),
    ]);

    const result: StudentAnalyticsResponse = {
      userId,
      totalCoursesEnrolled: totalCourses,
      coursesCompleted: completed,
      totalTimeSpentHours: Math.round((totalSeconds / 3600) * 100) / 100,
      overallCompletionRate: Math.round(avgCompletion * 100) / 100,
      averageQuizScore: Math.round(avgScore * 100) / 100,
      currentStreak: progresses[0]?.streakDays ?? 0,
      longestStreak: maxStreak,
      weeklyActivityHours: weeklyActivity,
      courseBreakdown: progresses.map((p) => ({
        courseId: p.courseId,
        progress: p.completionPercentage,
        timeSpentHours: Math.round((p.timeSpentSeconds / 3600) * 100) / 100,
        status: p.status,
      })),
      learningPattern,
    };

    await this.redis.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(result));
    return result;
  }

  // ─── Instructor Dashboard ─────────────────────────────────────────────────

  async getInstructorDashboard(
    instructorId: string,
    courseIds: string[],
  ): Promise<InstructorDashboardResponse> {
    const cacheKey = `analytics:instructor:${instructorId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as InstructorDashboardResponse;

    if (!courseIds.length) {
      return this.emptyInstructorDashboard(instructorId);
    }

    const [courseStats, atRiskStudents, recentActivity] = await Promise.all([
      Promise.all(courseIds.map((id) => this.getCourseAnalytics(id))),
      this.atRiskRepo.find({
        where: { courseId: In(courseIds), resolved: false },
        order: { riskScore: 'DESC' },
        take: 20,
      }),
      this.getRecentDailyActivity(courseIds),
    ]);

    const totalStudents = await this.progressRepo
      .createQueryBuilder('p')
      .where('p.courseId IN (:...courseIds)', { courseIds })
      .select('COUNT(DISTINCT p.userId)::int', 'count')
      .getRawOne<{ count: number }>();

    const avgCompletion =
      courseStats.reduce((sum, c) => sum + c.completionRate, 0) / (courseStats.length || 1);

    const topStudents = await this.progressRepo
      .createQueryBuilder('p')
      .where('p.courseId IN (:...courseIds)', { courseIds })
      .select([
        'p.userId',
        'AVG(p.completionPercentage) AS avgCompletion',
        'AVG(p.averageQuizScore) AS avgScore',
      ])
      .groupBy('p.userId')
      .orderBy('avgCompletion', 'DESC')
      .limit(10)
      .getRawMany();

    const result: InstructorDashboardResponse = {
      instructorId,
      totalStudents: totalStudents?.count ?? 0,
      totalCourses: courseIds.length,
      averageCourseCompletionRate: Math.round(avgCompletion * 100) / 100,
      atRiskStudents: atRiskStudents.length,
      recentActivity,
      coursePerformance: courseStats,
      topPerformingStudents: topStudents.map((s) => ({
        userId: s.p_userId,
        completionRate: Math.round(parseFloat(s.avgCompletion) * 100) / 100,
        avgScore: Math.round(parseFloat(s.avgScore) * 100) / 100,
      })),
      studentsNeedingAttention: atRiskStudents.map((r) => ({
        userId: r.userId,
        courseId: r.courseId,
        riskLevel: r.riskLevel,
        riskScore: r.riskScore,
        recommendations: r.recommendedInterventions ?? [],
      })),
    };

    await this.redis.setex(cacheKey, 120, JSON.stringify(result));
    return result;
  }

  // ─── Cache Invalidation ───────────────────────────────────────────────────

  async invalidateCourseCache(courseId: string): Promise<void> {
    const keys = await this.redis.keys(`analytics:course:${courseId}:*`);
    if (keys.length > 0) await this.redis.del(...keys);
  }

  async invalidateStudentCache(userId: string): Promise<void> {
    await this.redis.del(`analytics:student:${userId}`);
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private async getEngagementScore(
    courseId: string,
    start: Date,
    end: Date,
  ): Promise<{ score: number; activeStudents: number; dropoutRate: number }> {
    const events = await this.engagementRepo
      .createQueryBuilder('e')
      .where('e.courseId = :courseId', { courseId })
      .andWhere('e.createdAt BETWEEN :start AND :end', { start, end })
      .select([
        'COUNT(DISTINCT e.userId)::int AS "activeStudents"',
        'COUNT(*)::int AS "totalEvents"',
      ])
      .getRawOne<{ activeStudents: number; totalEvents: number }>();

    const totalEnrolled = await this.progressRepo.count({ where: { courseId } });
    const activeStudents = events?.activeStudents ?? 0;
    const dropoutRate =
      totalEnrolled > 0
        ? Math.round(((totalEnrolled - activeStudents) / totalEnrolled) * 10000) / 100
        : 0;

    const ratio = totalEnrolled > 0 ? activeStudents / totalEnrolled : 0;
    const score = Math.min(100, Math.round(ratio * Math.log((events?.totalEvents ?? 0) + 1) * 20));

    return { score, activeStudents, dropoutRate };
  }

  private async getWeeklyActivity(
    courseId: string,
    start: Date,
    end: Date,
  ): Promise<Array<{ week: string; activeUsers: number; completions: number }>> {
    const raw = await this.engagementRepo
      .createQueryBuilder('e')
      .where('e.courseId = :courseId', { courseId })
      .andWhere('e.createdAt BETWEEN :start AND :end', { start, end })
      .select([
        "TO_CHAR(DATE_TRUNC('week', e.createdAt), 'YYYY-MM-DD') AS week",
        'COUNT(DISTINCT e.userId)::int AS "activeUsers"',
      ])
      .groupBy("DATE_TRUNC('week', e.createdAt)")
      .orderBy("DATE_TRUNC('week', e.createdAt)")
      .getRawMany<{ week: string; activeUsers: number }>();

    const completions = await this.progressRepo
      .createQueryBuilder('p')
      .where('p.courseId = :courseId', { courseId })
      .andWhere('p.completedAt BETWEEN :start AND :end', { start, end })
      .select([
        "TO_CHAR(DATE_TRUNC('week', p.completedAt), 'YYYY-MM-DD') AS week",
        'COUNT(*)::int AS completions',
      ])
      .groupBy("DATE_TRUNC('week', p.completedAt)")
      .getRawMany<{ week: string; completions: number }>();

    const completionMap = new Map(completions.map((c) => [c.week, c.completions]));
    return raw.map((r) => ({
      week: r.week,
      activeUsers: r.activeUsers,
      completions: completionMap.get(r.week) ?? 0,
    }));
  }

  private async getTopLessons(
    courseId: string,
    start: Date,
    end: Date,
  ): Promise<Array<{ lessonId: string; views: number; avgDuration: number }>> {
    return this.engagementRepo
      .createQueryBuilder('e')
      .where('e.courseId = :courseId', { courseId })
      .andWhere('e.lessonId IS NOT NULL')
      .andWhere('e.createdAt BETWEEN :start AND :end', { start, end })
      .select([
        'e.lessonId AS "lessonId"',
        'COUNT(*)::int AS views',
        'ROUND(AVG(e.durationSeconds)::numeric, 0)::int AS "avgDuration"',
      ])
      .groupBy('e.lessonId')
      .orderBy('views', 'DESC')
      .limit(10)
      .getRawMany();
  }

  private async getStudentWeeklyActivity(
    userId: string,
  ): Promise<Array<{ week: string; hours: number }>> {
    const raw = await this.engagementRepo
      .createQueryBuilder('e')
      .where('e.userId = :userId', { userId })
      .andWhere('e.createdAt > :cutoff', { cutoff: new Date(Date.now() - 90 * 86_400_000) })
      .select([
        "TO_CHAR(DATE_TRUNC('week', e.createdAt), 'YYYY-MM-DD') AS week",
        'ROUND((SUM(e.durationSeconds) / 3600)::numeric, 2) AS hours',
      ])
      .groupBy("DATE_TRUNC('week', e.createdAt)")
      .orderBy("DATE_TRUNC('week', e.createdAt)")
      .getRawMany<{ week: string; hours: string }>();

    return raw.map((r) => ({ week: r.week, hours: parseFloat(r.hours) }));
  }

  private async getLearningPattern(userId: string): Promise<{
    mostActiveHour: number;
    mostActiveDayOfWeek: number;
    averageSessionMinutes: number;
    preferredDevice: string;
  }> {
    const [hourRaw, dayRaw, sessionRaw, deviceRaw] = await Promise.all([
      this.engagementRepo
        .createQueryBuilder('e')
        .where('e.userId = :userId', { userId })
        .select('EXTRACT(HOUR FROM e.createdAt)::int AS hour, COUNT(*) AS cnt')
        .groupBy('hour')
        .orderBy('cnt', 'DESC')
        .limit(1)
        .getRawOne<{ hour: number }>(),
      this.engagementRepo
        .createQueryBuilder('e')
        .where('e.userId = :userId', { userId })
        .select('EXTRACT(DOW FROM e.createdAt)::int AS dow, COUNT(*) AS cnt')
        .groupBy('dow')
        .orderBy('cnt', 'DESC')
        .limit(1)
        .getRawOne<{ dow: number }>(),
      this.engagementRepo
        .createQueryBuilder('e')
        .where('e.userId = :userId', { userId })
        .select('e.sessionId, SUM(e.durationSeconds) AS total')
        .groupBy('e.sessionId')
        .having('e.sessionId IS NOT NULL')
        .getRawMany<{ total: string }>(),
      this.engagementRepo
        .createQueryBuilder('e')
        .where('e.userId = :userId AND e.deviceType IS NOT NULL', { userId })
        .select('e.deviceType AS device, COUNT(*) AS cnt')
        .groupBy('e.deviceType')
        .orderBy('cnt', 'DESC')
        .limit(1)
        .getRawOne<{ device: string }>(),
    ]);

    const avgSessionSeconds =
      sessionRaw.length > 0
        ? sessionRaw.reduce((sum, s) => sum + parseFloat(s.total), 0) / sessionRaw.length
        : 0;

    return {
      mostActiveHour: hourRaw?.hour ?? 0,
      mostActiveDayOfWeek: dayRaw?.dow ?? 0,
      averageSessionMinutes: Math.round(avgSessionSeconds / 60),
      preferredDevice: deviceRaw?.device ?? 'unknown',
    };
  }

  private async getRecentDailyActivity(
    courseIds: string[],
  ): Promise<Array<{ date: string; activeStudents: number }>> {
    return this.engagementRepo
      .createQueryBuilder('e')
      .where('e.courseId IN (:...courseIds)', { courseIds })
      .andWhere('e.createdAt > :cutoff', { cutoff: new Date(Date.now() - 30 * 86_400_000) })
      .select([
        "TO_CHAR(DATE_TRUNC('day', e.createdAt), 'YYYY-MM-DD') AS date",
        'COUNT(DISTINCT e.userId)::int AS "activeStudents"',
      ])
      .groupBy("DATE_TRUNC('day', e.createdAt)")
      .orderBy("DATE_TRUNC('day', e.createdAt)")
      .getRawMany<{ date: string; activeStudents: number }>();
  }

  private emptyInstructorDashboard(instructorId: string): InstructorDashboardResponse {
    return {
      instructorId,
      totalStudents: 0,
      totalCourses: 0,
      averageCourseCompletionRate: 0,
      atRiskStudents: 0,
      recentActivity: [],
      coursePerformance: [],
      topPerformingStudents: [],
      studentsNeedingAttention: [],
    };
  }

  @Cron('0 3 * * *')
  async rebuildAggregations(): Promise<void> {
    this.logger.log('Rebuilding analytics aggregations');

    const courseIds = await this.progressRepo
      .createQueryBuilder('p')
      .select('DISTINCT p.courseId', 'courseId')
      .getRawMany<{ courseId: string }>();

    for (const { courseId } of courseIds) {
      await this.invalidateCourseCache(courseId);
    }

    this.logger.log(`Invalidated cache for ${courseIds.length} courses`);
  }
}
