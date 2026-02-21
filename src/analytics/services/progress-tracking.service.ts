import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

import {
  EngagementEvent,
  EngagementEventType,
} from '../../analytics/entities/engagement-event.entity';
import { AtRiskPrediction, RiskLevel } from '../../analytics/entities/at-risk-prediction.entity';
import { TrackEventDto } from '../../analytics/dto/analytics.dto';
import { ProgressStatus, StudentProgress } from '../entities/student.progress.entity';

export interface UpdateProgressDto {
  userId: string;
  courseId: string;
  lessonId?: string;
  moduleId?: string;
  learningPathId?: string;
  completionPercentage?: number;
  lessonsCompleted?: number;
  totalLessons?: number;
  timeSpentSeconds?: number;
  quizScore?: number;
}

@Injectable()
export class ProgressTrackingService {
  private readonly logger = new Logger(ProgressTrackingService.name);

  constructor(
    @InjectRepository(StudentProgress)
    private progressRepo: Repository<StudentProgress>,

    @InjectRepository(EngagementEvent)
    private engagementRepo: Repository<EngagementEvent>,

    @InjectRepository(AtRiskPrediction)
    private atRiskRepo: Repository<AtRiskPrediction>,

    @InjectQueue('analytics')
    private analyticsQueue: Queue,
  ) {}

  // ─── Progress Updates ─────────────────────────────────────────────────────

  async upsertProgress(dto: UpdateProgressDto): Promise<StudentProgress> {
    let progress = await this.progressRepo.findOne({
      where: { userId: dto.userId, courseId: dto.courseId },
    });

    if (!progress) {
      progress = this.progressRepo.create({
        userId: dto.userId,
        courseId: dto.courseId,
        learningPathId: dto.learningPathId,
        status: ProgressStatus.IN_PROGRESS,
        startedAt: new Date(),
      });
    }

    if (dto.completionPercentage !== undefined) {
      progress.completionPercentage = dto.completionPercentage;
    }
    if (dto.lessonsCompleted !== undefined) {
      progress.lessonsCompleted = dto.lessonsCompleted;
    }
    if (dto.totalLessons !== undefined) {
      progress.totalLessons = dto.totalLessons;
    }
    if (dto.timeSpentSeconds !== undefined) {
      progress.timeSpentSeconds += dto.timeSpentSeconds;
    }
    if (dto.lessonId) {
      progress.lessonId = dto.lessonId;
    }

    // Update quiz average
    if (dto.quizScore !== undefined) {
      progress.quizAttempts += 1;
      const prev = progress.averageQuizScore ?? 0;
      progress.averageQuizScore =
        (prev * (progress.quizAttempts - 1) + dto.quizScore) / progress.quizAttempts;
    }

    // Recalculate completion % from lessons if not provided directly
    if (dto.completionPercentage === undefined && progress.totalLessons > 0) {
      progress.completionPercentage = (progress.lessonsCompleted / progress.totalLessons) * 100;
    }

    // Auto-complete
    if (progress.completionPercentage >= 100 && progress.status !== ProgressStatus.COMPLETED) {
      progress.status = ProgressStatus.COMPLETED;
      progress.completedAt = new Date();
    }

    progress.lastActivityAt = new Date();
    const saved = await this.progressRepo.save(progress);

    // Queue streak update and at-risk check asynchronously
    await this.analyticsQueue.add(
      'update-streak',
      { userId: dto.userId },
      { removeOnComplete: true },
    );
    await this.analyticsQueue.add(
      'check-at-risk',
      { userId: dto.userId, courseId: dto.courseId },
      {
        delay: 5000,
        removeOnComplete: true,
      },
    );

    return saved;
  }

  async trackEvent(dto: TrackEventDto): Promise<void> {
    await this.engagementRepo.save(
      this.engagementRepo.create({
        userId: dto.userId,
        courseId: dto.courseId,
        lessonId: dto.lessonId,
        moduleId: dto.moduleId,
        eventType: dto.eventType as EngagementEventType,
        durationSeconds: dto.durationSeconds ?? 0,
        metadata: dto.metadata,
        sessionId: dto.sessionId,
        deviceType: dto.deviceType,
      }),
    );
  }

  // ─── Streak Calculation ───────────────────────────────────────────────────

  async updateStreak(userId: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const recentActivity = await this.engagementRepo.findOne({
      where: {
        userId,
        createdAt: Between(yesterday, today),
      },
    });

    const progresses = await this.progressRepo.find({ where: { userId } });

    for (const p of progresses) {
      const lastActive = p.lastActivityAt ? new Date(p.lastActivityAt) : null;
      if (!lastActive) continue;

      lastActive.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((today.getTime() - lastActive.getTime()) / 86_400_000);

      if (diffDays === 0) {
        // Already counted today
      } else if (diffDays === 1 && recentActivity) {
        p.streakDays += 1;
      } else if (diffDays > 1) {
        p.streakDays = 0; // streak broken
      }

      await this.progressRepo.save(p);
    }
  }

  // ─── At-Risk Detection ────────────────────────────────────────────────────

  async computeAtRisk(userId: string, courseId: string): Promise<AtRiskPrediction | null> {
    const progress = await this.progressRepo.findOne({ where: { userId, courseId } });
    if (!progress) return null;

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000);

    const recentEngagement = await this.engagementRepo.count({
      where: { userId, courseId, createdAt: MoreThan(sevenDaysAgo) },
    });

    const inactivityDays = progress.lastActivityAt
      ? Math.floor((now.getTime() - progress.lastActivityAt.getTime()) / 86_400_000)
      : 999;

    const riskFactors = {
      lowEngagement: recentEngagement < 3,
      missedDeadlines: false, // extend with deadline data from course entity
      decliningScores: progress.averageQuizScore !== null && progress.averageQuizScore < 60,
      inactivityDays,
      completionBehindSchedule: progress.completionPercentage < 30 && inactivityDays > 7,
      failedQuizzes:
        progress.quizAttempts > 0 && progress.averageQuizScore < 50
          ? Math.round(progress.quizAttempts * 0.5)
          : 0,
    };

    // Weighted risk score
    let score = 0;
    if (riskFactors.lowEngagement) score += 0.25;
    if (riskFactors.decliningScores) score += 0.2;
    if (inactivityDays >= 14) score += 0.3;
    else if (inactivityDays >= 7) score += 0.15;
    if (riskFactors.completionBehindSchedule) score += 0.15;
    if (riskFactors.failedQuizzes > 2) score += 0.1;
    score = Math.min(1, score);

    const riskLevel =
      score >= 0.75
        ? RiskLevel.CRITICAL
        : score >= 0.5
          ? RiskLevel.HIGH
          : score >= 0.25
            ? RiskLevel.MEDIUM
            : RiskLevel.LOW;

    if (riskLevel === RiskLevel.LOW) return null; // no need to record

    const recommendations: string[] = [];
    if (riskFactors.lowEngagement) recommendations.push('Schedule a check-in with the student');
    if (riskFactors.decliningScores)
      recommendations.push('Suggest revisiting foundational lessons');
    if (inactivityDays >= 7) recommendations.push('Send re-engagement notification');
    if (riskFactors.completionBehindSchedule) recommendations.push('Offer extended deadline');

    // Upsert
    let prediction = await this.atRiskRepo.findOne({ where: { userId, courseId } });
    if (!prediction) prediction = this.atRiskRepo.create({ userId, courseId });

    prediction.riskLevel = riskLevel;
    prediction.riskScore = score;
    prediction.riskFactors = riskFactors;
    prediction.recommendedInterventions = recommendations;
    prediction.resolved = false;

    return this.atRiskRepo.save(prediction);
  }

  // ─── Queries ──────────────────────────────────────────────────────────────

  async getUserProgress(userId: string, courseId?: string): Promise<StudentProgress[]> {
    const where: any = { userId };
    if (courseId) where.courseId = courseId;
    return this.progressRepo.find({ where, order: { updatedAt: 'DESC' } });
  }

  async getCourseProgressSummary(courseId: string): Promise<{
    totalEnrolled: number;
    completed: number;
    inProgress: number;
    notStarted: number;
    averageCompletion: number;
    averageTimeSpentHours: number;
    averageQuizScore: number;
  }> {
    const stats = await this.progressRepo
      .createQueryBuilder('p')
      .where('p.courseId = :courseId', { courseId })
      .select([
        'COUNT(*)::int AS "totalEnrolled"',
        'SUM(CASE WHEN p.status = \'completed\' THEN 1 ELSE 0 END)::int AS "completed"',
        'SUM(CASE WHEN p.status = \'in_progress\' THEN 1 ELSE 0 END)::int AS "inProgress"',
        'SUM(CASE WHEN p.status = \'not_started\' THEN 1 ELSE 0 END)::int AS "notStarted"',
        'ROUND(AVG(p.completionPercentage)::numeric, 2) AS "averageCompletion"',
        'ROUND((AVG(p.timeSpentSeconds) / 3600)::numeric, 2) AS "averageTimeSpentHours"',
        'ROUND(AVG(p.averageQuizScore)::numeric, 2) AS "averageQuizScore"',
      ])
      .getRawOne();

    return stats;
  }

  // ─── Scheduled Jobs ───────────────────────────────────────────────────────

  @Cron('0 2 * * *') // Daily at 2 AM
  async runDailyAtRiskScan(): Promise<void> {
    this.logger.log('Running daily at-risk student scan');
    const activeStudents = await this.progressRepo
      .createQueryBuilder('p')
      .select(['p.userId', 'p.courseId'])
      .where('p.status = :status', { status: ProgressStatus.IN_PROGRESS })
      .andWhere('p.lastActivityAt > :cutoff', {
        cutoff: new Date(Date.now() - 30 * 86_400_000),
      })
      .distinct(true)
      .getRawMany();

    for (const s of activeStudents) {
      await this.analyticsQueue.add(
        'check-at-risk',
        { userId: s.p_userId, courseId: s.p_courseId },
        { removeOnComplete: true },
      );
    }

    this.logger.log(`Queued at-risk check for ${activeStudents.length} students`);
  }
}
