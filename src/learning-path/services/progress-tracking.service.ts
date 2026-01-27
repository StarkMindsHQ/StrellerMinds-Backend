import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Between } from 'typeorm';
import { LearningPathEnrollment, EnrollmentStatus } from '../entities/learning-path-enrollment.entity';
import { NodeProgress, ProgressStatus } from '../entities/node-progress.entity';
import { LearningPathNode } from '../entities/learning-path-node.entity';
import { LearningPath } from '../entities/learning-path.entity';
import { User } from '../../auth/entities/user.entity';

export interface ProgressUpdateDto {
  nodeId: string;
  status: ProgressStatus;
  completionPercentage?: number;
  timeSpentMinutes?: number;
  score?: number;
  assessmentData?: Record<string, any>;
}

export interface AnalyticsReport {
  overview: {
    totalEnrollments: number;
    activeEnrollments: number;
    completionRate: number;
    averageProgress: number;
  };
  engagement: {
    dailyActiveUsers: number[];
    timeSpent: {
      total: number;
      averagePerUser: number;
      averagePerNode: number;
    };
  };
  performance: {
    averageScore: number;
    scoreDistribution: Record<string, number>;
    completionTrends: any[];
  };
  retention: {
    dropoutRate: number;
    completionTimeline: any[];
  };
}

@Injectable()
export class ProgressTrackingService {
  constructor(
    @InjectRepository(LearningPathEnrollment)
    private readonly enrollmentRepository: Repository<LearningPathEnrollment>,
    @InjectRepository(NodeProgress)
    private readonly progressRepository: Repository<NodeProgress>,
    @InjectRepository(LearningPathNode)
    private readonly nodeRepository: Repository<LearningPathNode>,
    @InjectRepository(LearningPath)
    private readonly learningPathRepository: Repository<LearningPath>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async enrollUser(userId: string, learningPathId: string): Promise<LearningPathEnrollment> {
    // Check if already enrolled
    const existingEnrollment = await this.enrollmentRepository.findOne({
      where: { userId, learningPathId },
    });

    if (existingEnrollment) {
      return existingEnrollment;
    }

    const enrollment = this.enrollmentRepository.create({
      userId,
      learningPathId,
      status: EnrollmentStatus.ENROLLED,
      startDate: new Date(),
    });

    const savedEnrollment = await this.enrollmentRepository.save(enrollment);

    // Initialize progress records for all nodes
    const nodes = await this.nodeRepository.find({ where: { learningPathId } });
    
    const progressRecords = nodes.map(node =>
      this.progressRepository.create({
        enrollmentId: savedEnrollment.id,
        nodeId: node.id,
        status: ProgressStatus.NOT_STARTED,
      })
    );

    await this.progressRepository.save(progressRecords);

    return savedEnrollment;
  }

  async updateProgress(enrollmentId: string, updateDto: ProgressUpdateDto): Promise<NodeProgress> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { id: enrollmentId },
      relations: ['learningPath'],
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment with ID ${enrollmentId} not found`);
    }

    let progress = await this.progressRepository.findOne({
      where: { enrollmentId, nodeId: updateDto.nodeId },
    });

    if (!progress) {
      // Create new progress record if it doesn't exist
      progress = this.progressRepository.create({
        enrollmentId,
        nodeId: updateDto.nodeId,
        ...updateDto,
      });
    } else {
      // Update existing record
      Object.assign(progress, updateDto);
    }

    // Set timestamps
    if (updateDto.status === ProgressStatus.IN_PROGRESS && !progress.startedAt) {
      progress.startedAt = new Date();
    }

    if (updateDto.status === ProgressStatus.COMPLETED && !progress.completedAt) {
      progress.completedAt = new Date();
      progress.completionPercentage = 100;
    }

    const savedProgress = await this.progressRepository.save(progress);

    // Update overall enrollment progress
    await this.updateEnrollmentProgress(enrollmentId);

    // Update enrollment status if needed
    if (updateDto.status === ProgressStatus.COMPLETED) {
      await this.checkEnrollmentCompletion(enrollmentId);
    }

    return savedProgress;
  }

  private async updateEnrollmentProgress(enrollmentId: string): Promise<void> {
    const progressRecords = await this.progressRepository.find({
      where: { enrollmentId },
    });

    if (progressRecords.length === 0) return;

    const completedCount = progressRecords.filter(
      p => p.status === ProgressStatus.COMPLETED
    ).length;

    const overallProgress = (completedCount / progressRecords.length) * 100;

    await this.enrollmentRepository.update(enrollmentId, {
      overallProgress,
      status: overallProgress === 100 
        ? EnrollmentStatus.COMPLETED 
        : EnrollmentStatus.IN_PROGRESS,
    });
  }

  private async checkEnrollmentCompletion(enrollmentId: string): Promise<void> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { id: enrollmentId },
      relations: ['nodeProgress'],
    });

    if (!enrollment) return;

    const allCompleted = enrollment.nodeProgress.every(
      p => p.status === ProgressStatus.COMPLETED
    );

    if (allCompleted && enrollment.status !== EnrollmentStatus.COMPLETED) {
      await this.enrollmentRepository.update(enrollmentId, {
        status: EnrollmentStatus.COMPLETED,
        completionDate: new Date(),
        overallProgress: 100,
      });
    }
  }

  async getUserProgress(userId: string, learningPathId: string): Promise<any> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { userId, learningPathId },
      relations: ['learningPath', 'nodeProgress', 'nodeProgress.node'],
    });

    if (!enrollment) {
      throw new NotFoundException('User is not enrolled in this learning path');
    }

    const nodes = await this.nodeRepository.find({
      where: { learningPathId },
      order: { position: 'ASC' },
    });

    const nodeProgressMap = new Map(
      enrollment.nodeProgress.map(p => [p.nodeId, p])
    );

    const progressDetails = nodes.map(node => ({
      nodeId: node.id,
      title: node.title,
      type: node.type,
      position: node.position,
      status: nodeProgressMap.get(node.id)?.status || ProgressStatus.NOT_STARTED,
      completionPercentage: nodeProgressMap.get(node.id)?.completionPercentage || 0,
      timeSpentMinutes: nodeProgressMap.get(node.id)?.timeSpentMinutes || 0,
      score: nodeProgressMap.get(node.id)?.score || null,
      startedAt: nodeProgressMap.get(node.id)?.startedAt || null,
      completedAt: nodeProgressMap.get(node.id)?.completedAt || null,
    }));

    return {
      enrollmentId: enrollment.id,
      overallProgress: enrollment.overallProgress,
      status: enrollment.status,
      startDate: enrollment.startDate,
      completionDate: enrollment.completionDate,
      nodes: progressDetails,
    };
  }

  async getEnrollmentAnalytics(learningPathId: string, timeframe: 'week' | 'month' | 'year' = 'month'): Promise<AnalyticsReport> {
    const endDate = new Date();
    const startDate = new Date();

    switch (timeframe) {
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
    }

    const enrollments = await this.enrollmentRepository.find({
      where: { 
        learningPathId,
        createdAt: Between(startDate, endDate),
      },
      relations: ['nodeProgress'],
    });

    const totalEnrollments = enrollments.length;
    const activeEnrollments = enrollments.filter(e => 
      e.status === EnrollmentStatus.IN_PROGRESS || e.status === EnrollmentStatus.ENROLLED
    ).length;

    const completedEnrollments = enrollments.filter(e => 
      e.status === EnrollmentStatus.COMPLETED
    );

    const completionRate = totalEnrollments > 0 
      ? (completedEnrollments.length / totalEnrollments) * 100 
      : 0;

    const averageProgress = totalEnrollments > 0
      ? enrollments.reduce((sum, e) => sum + e.overallProgress, 0) / totalEnrollments
      : 0;

    // Engagement metrics
    const allProgress = enrollments.flatMap(e => e.nodeProgress);
    const totalTimeSpent = allProgress.reduce((sum, p) => sum + p.timeSpentMinutes, 0);
    
    const dailyActiveUsers = await this.getDailyActiveUsers(learningPathId, startDate, endDate);
    
    // Performance metrics
    const assessments = allProgress.filter(p => p.score !== null);
    const averageScore = assessments.length > 0
      ? assessments.reduce((sum, p) => sum + (p.score || 0), 0) / assessments.length
      : 0;

    const scoreDistribution = this.calculateScoreDistribution(assessments);
    const completionTrends = await this.getCompletionTrends(learningPathId, startDate, endDate);

    // Retention metrics
    const dropoutEnrollments = enrollments.filter(e => e.status === EnrollmentStatus.DROPPED);
    const dropoutRate = totalEnrollments > 0 
      ? (dropoutEnrollments.length / totalEnrollments) * 100 
      : 0;

    const completionTimeline = await this.getCompletionTimeline(learningPathId, startDate, endDate);

    return {
      overview: {
        totalEnrollments,
        activeEnrollments,
        completionRate,
        averageProgress,
      },
      engagement: {
        dailyActiveUsers,
        timeSpent: {
          total: totalTimeSpent,
          averagePerUser: totalEnrollments > 0 ? totalTimeSpent / totalEnrollments : 0,
          averagePerNode: allProgress.length > 0 ? totalTimeSpent / allProgress.length : 0,
        },
      },
      performance: {
        averageScore,
        scoreDistribution,
        completionTrends,
      },
      retention: {
        dropoutRate,
        completionTimeline,
      },
    };
  }

  private async getDailyActiveUsers(learningPathId: string, startDate: Date, endDate: Date): Promise<number[]> {
    // This would typically involve querying a more granular activity log
    // For now, returning placeholder data
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return Array(days).fill(0).map(() => Math.floor(Math.random() * 50) + 10);
  }

  private calculateScoreDistribution(assessments: NodeProgress[]): Record<string, number> {
    const distribution: Record<string, number> = {
      '0-59': 0,
      '60-69': 0,
      '70-79': 0,
      '80-89': 0,
      '90-100': 0,
    };

    assessments.forEach(assessment => {
      const score = assessment.score || 0;
      if (score < 60) distribution['0-59']++;
      else if (score < 70) distribution['60-69']++;
      else if (score < 80) distribution['70-79']++;
      else if (score < 90) distribution['80-89']++;
      else distribution['90-100']++;
    });

    return distribution;
  }

  private async getCompletionTrends(learningPathId: string, startDate: Date, endDate: Date): Promise<any[]> {
    // Placeholder implementation
    return [
      { week: 'Week 1', completions: 5 },
      { week: 'Week 2', completions: 8 },
      { week: 'Week 3', completions: 12 },
      { week: 'Week 4', completions: 15 },
    ];
  }

  private async getCompletionTimeline(learningPathId: string, startDate: Date, endDate: Date): Promise<any[]> {
    // Placeholder implementation
    return [
      { date: '2024-01-01', cumulativeCompletions: 5 },
      { date: '2024-01-08', cumulativeCompletions: 13 },
      { date: '2024-01-15', cumulativeCompletions: 25 },
      { date: '2024-01-22', cumulativeCompletions: 40 },
    ];
  }

  async getLearningPathCompletionStats(learningPathId: string): Promise<any> {
    const enrollments = await this.enrollmentRepository.find({
      where: { learningPathId },
      relations: ['user'],
    });

    const stats = {
      totalEnrollments: enrollments.length,
      completed: 0,
      inProgress: 0,
      notStarted: 0,
      dropped: 0,
      completionRate: 0,
      averageTimeToComplete: 0,
      completionTimes: [] as number[],
    };

    enrollments.forEach(enrollment => {
      switch (enrollment.status) {
        case EnrollmentStatus.COMPLETED:
          stats.completed++;
          if (enrollment.startDate && enrollment.completionDate) {
            const timeToComplete = enrollment.completionDate.getTime() - enrollment.startDate.getTime();
            stats.completionTimes.push(timeToComplete);
          }
          break;
        case EnrollmentStatus.IN_PROGRESS:
          stats.inProgress++;
          break;
        case EnrollmentStatus.ENROLLED:
          stats.notStarted++;
          break;
        case EnrollmentStatus.DROPPED:
          stats.dropped++;
          break;
      }
    });

    stats.completionRate = stats.totalEnrollments > 0 
      ? (stats.completed / stats.totalEnrollments) * 100 
      : 0;

    if (stats.completionTimes.length > 0) {
      const avgTime = stats.completionTimes.reduce((sum, time) => sum + time, 0) / stats.completionTimes.length;
      stats.averageTimeToComplete = avgTime / (1000 * 60 * 60 * 24); // Convert to days
    }

    return stats;
  }

  async getUserLearningHistory(userId: string): Promise<any> {
    const enrollments = await this.enrollmentRepository.find({
      where: { userId },
      relations: ['learningPath', 'nodeProgress'],
    });

    return enrollments.map(enrollment => ({
      enrollmentId: enrollment.id,
      learningPath: {
        id: enrollment.learningPath.id,
        title: enrollment.learningPath.title,
        type: enrollment.learningPath.type,
      },
      status: enrollment.status,
      overallProgress: enrollment.overallProgress,
      startDate: enrollment.startDate,
      completionDate: enrollment.completionDate,
      nodesCompleted: enrollment.nodeProgress.filter(p => p.status === ProgressStatus.COMPLETED).length,
      totalNodes: enrollment.nodeProgress.length,
    }));
  }

  async getTimeSpentReport(userId: string, startDate?: Date, endDate?: Date): Promise<any> {
    const whereClause: any = { userId };
    
    if (startDate && endDate) {
      whereClause.createdAt = Between(startDate, endDate);
    }

    const enrollments = await this.enrollmentRepository.find({
      where: whereClause,
      relations: ['nodeProgress'],
    });

    const totalTime = enrollments.flatMap(e => e.nodeProgress)
      .reduce((sum, p) => sum + p.timeSpentMinutes, 0);

    const dailyBreakdown = this.generateDailyBreakdown(enrollments, startDate, endDate);

    return {
      totalTimeMinutes: totalTime,
      totalTimeHours: Math.round(totalTime / 60),
      dailyAverage: dailyBreakdown.length > 0 
        ? totalTime / dailyBreakdown.length 
        : 0,
      dailyBreakdown,
    };
  }

  private generateDailyBreakdown(enrollments: LearningPathEnrollment[], startDate?: Date, endDate?: Date): any[] {
    // Placeholder implementation
    const breakdown = [];
    const currentDate = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const finalDate = endDate || new Date();

    for (let d = new Date(currentDate); d <= finalDate; d.setDate(d.getDate() + 1)) {
      breakdown.push({
        date: new Date(d).toISOString().split('T')[0],
        minutes: Math.floor(Math.random() * 120),
      });
    }

    return breakdown;
  }
}