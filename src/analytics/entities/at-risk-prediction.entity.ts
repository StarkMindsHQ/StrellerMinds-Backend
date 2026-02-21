import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

@Entity('at_risk_predictions')
@Index(['userId', 'courseId'])
@Index(['riskLevel', 'createdAt'])
export class AtRiskPrediction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  @Column({ type: 'uuid' })
  courseId: string;

  @Column({ type: 'enum', enum: RiskLevel })
  riskLevel: RiskLevel;

  @Column({ type: 'decimal', precision: 5, scale: 4 })
  riskScore: number; // 0.0 - 1.0

  @Column({ type: 'jsonb' })
  riskFactors: {
    lowEngagement: boolean;
    missedDeadlines: boolean;
    decliningScores: boolean;
    inactivityDays: number;
    completionBehindSchedule: boolean;
    failedQuizzes: number;
  };

  @Column({ type: 'jsonb', nullable: true })
  recommendedInterventions: string[];

  @Column({ type: 'boolean', default: false })
  instructorNotified: boolean;

  @Column({ type: 'timestamp', nullable: true })
  notifiedAt: Date;

  @Column({ type: 'boolean', default: false })
  resolved: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
