import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NodeProgress } from '../../learning-path/entities/node-progress.entity';
import { LearningPathEnrollment } from '../../learning-path/entities/learning-path-enrollment.entity';

export interface LearningPattern {
  type: 'binge_learner' | 'consistent' | 'weekend_warrior' | 'struggling' | 'high_performer';
  confidence: number;
  insights: string[];
}

@Injectable()
export class LearningPatternAnalysisService {
  private readonly logger = new Logger(LearningPatternAnalysisService.name);

  constructor(
    @InjectRepository(NodeProgress)
    private progressRepository: Repository<NodeProgress>,
    @InjectRepository(LearningPathEnrollment)
    private enrollmentRepository: Repository<LearningPathEnrollment>,
  ) {}

  async analyzeUserPattern(userId: string): Promise<LearningPattern> {
    const progress = await this.progressRepository.find({
      where: { enrollment: { userId } },
      order: { updatedAt: 'DESC' },
      take: 50,
    });

    if (!progress.length) {
      return { type: 'consistent', confidence: 0.1, insights: ['Not enough data'] };
    }

    // Analyze time distribution
    const timeDistribution = this.analyzeTimeDistribution(progress);
    
    // Analyze performance
    const avgScore = progress.reduce((acc, p) => acc + (p.score || 0), 0) / (progress.filter(p => p.score).length || 1);

    if (avgScore < 60) {
      return {
        type: 'struggling',
        confidence: 0.8,
        insights: ['Average score below 60%', 'High time spent per node'],
      };
    }

    if (avgScore > 90) {
      return {
        type: 'high_performer',
        confidence: 0.9,
        insights: ['Consistently high scores', 'Fast completion times'],
      };
    }

    if (timeDistribution.isWeekendHeavy) {
      return {
        type: 'weekend_warrior',
        confidence: 0.7,
        insights: ['Most activity detected on Saturdays and Sundays'],
      };
    }

    return {
      type: 'consistent',
      confidence: 0.6,
      insights: ['Regular learning intervals detected'],
    };
  }

  private analyzeTimeDistribution(progress: NodeProgress[]) {
    const weekendActivity = progress.filter(p => {
      const day = p.updatedAt.getDay();
      return day === 0 || day === 6;
    }).length;

    return {
      isWeekendHeavy: (weekendActivity / progress.length) > 0.6
    };
  }
}