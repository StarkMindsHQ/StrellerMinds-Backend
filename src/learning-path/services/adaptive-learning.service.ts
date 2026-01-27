import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { LearningPathEnrollment } from '../entities/learning-path-enrollment.entity';
import { NodeProgress, ProgressStatus } from '../entities/node-progress.entity';
import { LearningPathNode } from '../entities/learning-path-node.entity';
import { NodeDependency, DependencyType } from '../entities/node-dependency.entity';
import { LearningObjective } from '../entities/learning-objective.entity';

export interface AdaptiveRecommendation {
  nodeId: string;
  title: string;
  reason: string;
  confidence: number; // 0-1 scale
  alternativePaths?: string[];
}

export interface PerformanceMetrics {
  avgScore: number;
  completionRate: number;
  timeSpent: number;
  attempts: number;
  strengthAreas: string[];
  weaknessAreas: string[];
}

@Injectable()
export class AdaptiveLearningService {
  constructor(
    @InjectRepository(LearningPathEnrollment)
    private readonly enrollmentRepository: Repository<LearningPathEnrollment>,
    @InjectRepository(NodeProgress)
    private readonly progressRepository: Repository<NodeProgress>,
    @InjectRepository(LearningPathNode)
    private readonly nodeRepository: Repository<LearningPathNode>,
    @InjectRepository(NodeDependency)
    private readonly dependencyRepository: Repository<NodeDependency>,
    @InjectRepository(LearningObjective)
    private readonly objectiveRepository: Repository<LearningObjective>,
  ) {}

  async getNextRecommendedNode(enrollmentId: string): Promise<AdaptiveRecommendation | null> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { id: enrollmentId },
      relations: ['learningPath', 'nodeProgress'],
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment with ID ${enrollmentId} not found`);
    }

    const completedNodes = enrollment.nodeProgress
      .filter(p => p.status === ProgressStatus.COMPLETED)
      .map(p => p.nodeId);

    const inProgressNodes = enrollment.nodeProgress
      .filter(p => p.status === ProgressStatus.IN_PROGRESS)
      .map(p => p.nodeId);

    const allNodes = await this.nodeRepository.find({
      where: { learningPathId: enrollment.learningPathId },
      relations: ['prerequisites', 'outgoingDependencies', 'learningObjectives'],
    });

    // Find available nodes (not completed and not in progress)
    const availableNodes = allNodes.filter(node => 
      !completedNodes.includes(node.id) && 
      !inProgressNodes.includes(node.id)
    );

    // Filter nodes that have all prerequisites met
    const readyNodes = availableNodes.filter(node => {
      const unsatisfiedPrerequisites = node.prerequisites.filter(
        prereq => !completedNodes.includes(prereq.id)
      );
      return unsatisfiedPrerequisites.length === 0;
    });

    if (readyNodes.length === 0) {
      return null; // No nodes available
    }

    // Score nodes based on adaptive criteria
    const scoredNodes = await Promise.all(
      readyNodes.map(async node => {
        const score = await this.calculateNodeScore(node, enrollment, allNodes);
        return { node, score };
      })
    );

    // Sort by score (highest first)
    scoredNodes.sort((a, b) => b.score.confidence - a.score.confidence);

    const bestNode = scoredNodes[0];
    return {
      nodeId: bestNode.node.id,
      title: bestNode.node.title,
      reason: bestNode.score.reason,
      confidence: bestNode.score.confidence,
      alternativePaths: scoredNodes.slice(1, 4).map(s => s.node.id),
    };
  }

  private async calculateNodeScore(
    node: LearningPathNode,
    enrollment: LearningPathEnrollment,
    allNodes: LearningPathNode[]
  ): Promise<{ confidence: number; reason: string }> {
    const metrics = await this.getPerformanceMetrics(enrollment.userId, enrollment.learningPathId);
    
    let score = 0.5; // Base score
    const reasons: string[] = [];

    // Factor 1: Learning objectives alignment with weaknesses
    if (node.learningObjectives && node.learningObjectives.length > 0) {
      const weakObjectives = metrics.weaknessAreas;
      const nodeObjectives = node.learningObjectives.map(obj => obj.domain);
      const intersection = weakObjectives.filter(obj => nodeObjectives.includes(obj));
      
      if (intersection.length > 0) {
        score += 0.3;
        reasons.push(`Addresses weak areas: ${intersection.join(', ')}`);
      }
    }

    // Factor 2: Difficulty adjustment based on performance
    if (metrics.avgScore < 60) {
      // Student struggling - recommend easier/similar content
      score += 0.2;
      reasons.push('Matches current skill level');
    } else if (metrics.avgScore > 85) {
      // High performer - recommend challenging content
      const hasAssessment = node.type === 'assessment';
      if (hasAssessment) {
        score += 0.25;
        reasons.push('Provides appropriate challenge');
      }
    }

    // Factor 3: Time-based recommendations
    const recentProgress = enrollment.nodeProgress
      .filter(p => p.completedAt && new Date().getTime() - p.completedAt.getTime() < 7 * 24 * 60 * 60 * 1000)
      .length;

    if (recentProgress === 0) {
      score += 0.15;
      reasons.push('Encourages consistent progress');
    }

    // Factor 4: Diversity of content types
    const recentTypes = enrollment.nodeProgress
      .slice(-3)
      .map(p => allNodes.find(n => n.id === p.nodeId)?.type || '');

    if (!recentTypes.includes(node.type)) {
      score += 0.1;
      reasons.push('Provides variety in learning');
    }

    // Factor 5: Prerequisite strength
    const prerequisiteStrength = await this.calculatePrerequisiteStrength(node, enrollment);
    score += prerequisiteStrength * 0.2;
    if (prerequisiteStrength > 0.7) {
      reasons.push('Strong foundation prepared');
    }

    return {
      confidence: Math.min(score, 1),
      reason: reasons.length > 0 ? reasons.join('; ') : 'Good next step in learning path',
    };
  }

  private async calculatePrerequisiteStrength(
    node: LearningPathNode,
    enrollment: LearningPathEnrollment
  ): Promise<number> {
    if (!node.prerequisites || node.prerequisites.length === 0) {
      return 1; // No prerequisites needed
    }

    const prerequisiteProgress = await this.progressRepository.find({
      where: {
        enrollmentId: enrollment.id,
        nodeId: In(node.prerequisites.map(p => p.id)),
      },
    });

    if (prerequisiteProgress.length === 0) {
      return 0;
    }

    const totalScore = prerequisiteProgress.reduce((sum, progress) => {
      const weight = progress.status === ProgressStatus.COMPLETED ? 1 : 0.5;
      const scoreContribution = progress.score ? progress.score / 100 : 0.7;
      return sum + (weight * scoreContribution);
    }, 0);

    return totalScore / node.prerequisites.length;
  }

  async getPerformanceMetrics(userId: string, learningPathId: string): Promise<PerformanceMetrics> {
    const enrollments = await this.enrollmentRepository.find({
      where: { userId, learningPathId },
      relations: ['nodeProgress', 'nodeProgress.node'],
    });

    if (enrollments.length === 0) {
      return {
        avgScore: 0,
        completionRate: 0,
        timeSpent: 0,
        attempts: 0,
        strengthAreas: [],
        weaknessAreas: [],
      };
    }

    const allProgress = enrollments.flatMap(e => e.nodeProgress);
    
    const completedProgress = allProgress.filter(p => p.status === ProgressStatus.COMPLETED);
    const assessmentProgress = allProgress.filter(p => p.score !== null);

    const avgScore = assessmentProgress.length > 0
      ? assessmentProgress.reduce((sum, p) => sum + (p.score || 0), 0) / assessmentProgress.length
      : 0;

    const completionRate = allProgress.length > 0
      ? (completedProgress.length / allProgress.length) * 100
      : 0;

    const timeSpent = allProgress.reduce((sum, p) => sum + p.timeSpentMinutes, 0);
    const attempts = allProgress.reduce((sum, p) => sum + (p.attempts || 0), 0);

    // Analyze strengths and weaknesses by objective domain
    const objectivePerformance = new Map<string, { scores: number[]; count: number }>();

    for (const progress of assessmentProgress) {
      const node = progress.node;
      if (node && node.learningObjectives) {
        for (const objective of node.learningObjectives) {
          if (!objectivePerformance.has(objective.domain)) {
            objectivePerformance.set(objective.domain, { scores: [], count: 0 });
          }
          
          const perf = objectivePerformance.get(objective.domain)!;
          if (progress.score !== null) {
            perf.scores.push(progress.score);
            perf.count++;
          }
        }
      }
    }

    const domains = Array.from(objectivePerformance.entries());
    domains.sort(([,a], [,b]) => {
      const avgA = a.scores.length > 0 ? a.scores.reduce((sum, s) => sum + s, 0) / a.scores.length : 0;
      const avgB = b.scores.length > 0 ? b.scores.reduce((sum, s) => sum + s, 0) / b.scores.length : 0;
      return avgB - avgA; // Sort descending by average score
    });

    const strengthAreas = domains.slice(0, 3).map(([domain]) => domain);
    const weaknessAreas = domains.slice(-3).map(([domain]) => domain).reverse();

    return {
      avgScore,
      completionRate,
      timeSpent,
      attempts,
      strengthAreas,
      weaknessAreas,
    };
  }

  async updatePathBasedOnPerformance(enrollmentId: string): Promise<void> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { id: enrollmentId },
      relations: ['learningPath', 'nodeProgress'],
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment with ID ${enrollmentId} not found`);
    }

    const metrics = await this.getPerformanceMetrics(enrollment.userId, enrollment.learningPathId);
    
    // Adjust learning path based on performance
    if (metrics.avgScore < 50) {
      // Student is struggling - add remedial content
      await this.addRemedialContent(enrollment.learningPathId);
    } else if (metrics.avgScore > 90) {
      // High performer - add advanced content
      await this.addAdvancedContent(enrollment.learningPathId);
    }

    // Update enrollment metadata with adaptation info
    const adaptationLog = enrollment.metadata.adaptations || [];
    adaptationLog.push({
      timestamp: new Date(),
      metrics,
      action: 'performance_based_adjustment',
    });

    await this.enrollmentRepository.update(enrollmentId, {
      metadata: {
        ...enrollment.metadata,
        adaptations: adaptationLog,
      },
    });
  }

  private async addRemedialContent(learningPathId: string): Promise<void> {
    // Implementation would add supplementary materials for struggling students
    console.log(`Adding remedial content for learning path ${learningPathId}`);
  }

  private async addAdvancedContent(learningPathId: string): Promise<void> {
    // Implementation would add challenging extensions for high performers
    console.log(`Adding advanced content for learning path ${learningPathId}`);
  }

  async getPathCompletionPrediction(enrollmentId: string): Promise<{ 
    estimatedCompletionDate: Date; 
    confidence: number;
    milestones: { date: Date; percentage: number }[];
  }> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { id: enrollmentId },
      relations: ['nodeProgress'],
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment with ID ${enrollmentId} not found`);
    }

    const progress = enrollment.nodeProgress;
    const completedNodes = progress.filter(p => p.status === ProgressStatus.COMPLETED).length;
    const totalNodes = enrollment.overallProgress > 0 ? 
      Math.round(completedNodes / (enrollment.overallProgress / 100)) : 
      completedNodes;

    if (totalNodes === 0 || completedNodes === 0) {
      return {
        estimatedCompletionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
        confidence: 0.3,
        milestones: [],
      };
    }

    // Calculate average time per node
    const totalTime = progress.reduce((sum, p) => sum + p.timeSpentMinutes, 0);
    const avgTimePerNode = totalTime / completedNodes;
    
    const remainingNodes = totalNodes - completedNodes;
    const remainingTimeMinutes = remainingNodes * avgTimePerNode;
    
    const estimatedCompletionDate = new Date(Date.now() + remainingTimeMinutes * 60 * 1000);

    // Confidence based on completion percentage and consistency
    const completionPercentage = completedNodes / totalNodes;
    const timeConsistency = this.calculateTimeConsistency(progress);
    const confidence = Math.min(
      0.5 + (completionPercentage * 0.3) + (timeConsistency * 0.2),
      0.95
    );

    // Generate milestones
    const milestones = [];
    for (let i = 25; i <= 100; i += 25) {
      if (i > completionPercentage * 100) {
        const milestoneNodes = Math.floor((i / 100) * totalNodes);
        const remainingMilestoneNodes = milestoneNodes - completedNodes;
        const milestoneTime = remainingMilestoneNodes * avgTimePerNode * 60 * 1000;
        milestones.push({
          date: new Date(Date.now() + milestoneTime),
          percentage: i,
        });
      }
    }

    return {
      estimatedCompletionDate,
      confidence,
      milestones,
    };
  }

  private calculateTimeConsistency(progress: NodeProgress[]): number {
    if (progress.length < 2) return 0.5;

    const times = progress
      .filter(p => p.timeSpentMinutes > 0)
      .map(p => p.timeSpentMinutes)
      .sort((a, b) => a - b);

    if (times.length < 2) return 0.5;

    const median = times[Math.floor(times.length / 2)];
    const deviations = times.map(t => Math.abs(t - median) / median);
    const avgDeviation = deviations.reduce((sum, d) => sum + d, 0) / deviations.length;

    return Math.max(0, 1 - avgDeviation); // Convert deviation to consistency score
  }
}