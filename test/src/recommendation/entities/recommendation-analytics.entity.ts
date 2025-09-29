import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum AnalyticsEventType {
  RECOMMENDATION_GENERATED = 'recommendation_generated',
  RECOMMENDATION_VIEWED = 'recommendation_viewed',
  RECOMMENDATION_CLICKED = 'recommendation_clicked',
  RECOMMENDATION_DISMISSED = 'recommendation_dismissed',
  RECOMMENDATION_COMPLETED = 'recommendation_completed',
  LEARNING_PATH_CREATED = 'learning_path_created',
  LEARNING_PATH_STARTED = 'learning_path_started',
  LEARNING_PATH_STEP_COMPLETED = 'learning_path_step_completed',
  LEARNING_PATH_COMPLETED = 'learning_path_completed',
  ALGORITHM_PERFORMANCE = 'algorithm_performance',
  MODEL_RETRAINED = 'model_retrained',
}

@Entity('recommendation_analytics')
@Index(['eventType', 'createdAt'])
@Index(['userId', 'eventType'])
@Index(['algorithmVersion'])
@Index(['createdAt'])
export class RecommendationAnalytics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: AnalyticsEventType,
  })
  eventType: AnalyticsEventType;

  @Column('uuid', { nullable: true })
  @Index()
  userId?: string;

  @Column('uuid', { nullable: true })
  recommendationId?: string;

  @Column('uuid', { nullable: true })
  learningPathId?: string;

  @Column('uuid', { nullable: true })
  courseId?: string;

  @Column('varchar', { length: 100, nullable: true })
  algorithmVersion?: string;

  @Column('varchar', { length: 100, nullable: true })
  modelVersion?: string;

  @Column('decimal', { precision: 5, scale: 4, nullable: true })
  confidenceScore?: number;

  @Column('decimal', { precision: 5, scale: 4, nullable: true })
  relevanceScore?: number;

  @Column('decimal', { precision: 5, scale: 4, nullable: true })
  actualScore?: number; // User feedback or implicit feedback score

  @Column('int', { nullable: true })
  position?: number; // Position in recommendation list

  @Column('int', { nullable: true })
  totalRecommendations?: number;

  @Column('jsonb', { nullable: true })
  metadata?: {
    sessionId?: string;
    deviceType?: string;
    context?: string;
    experimentGroup?: string;
    abTestVariant?: string;
    features?: Record<string, any>;
    performance?: {
      precision?: number;
      recall?: number;
      f1Score?: number;
      ndcg?: number;
      clickThroughRate?: number;
      conversionRate?: number;
    };
    timing?: {
      generationTimeMs?: number;
      modelInferenceTimeMs?: number;
      dataRetrievalTimeMs?: number;
    };
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('recommendation_metrics')
@Index(['metricType', 'date'])
@Index(['algorithmVersion', 'date'])
export class RecommendationMetrics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('date')
  @Index()
  date: Date;

  @Column('varchar', { length: 100 })
  metricType: string; // 'ctr', 'conversion_rate', 'precision', 'recall', etc.

  @Column('varchar', { length: 100, nullable: true })
  algorithmVersion?: string;

  @Column('varchar', { length: 100, nullable: true })
  segmentType?: string; // 'all_users', 'new_users', 'returning_users', etc.

  @Column('varchar', { length: 100, nullable: true })
  segmentValue?: string;

  @Column('decimal', { precision: 10, scale: 6 })
  value: number;

  @Column('int', { default: 0 })
  sampleSize: number;

  @Column('decimal', { precision: 10, scale: 6, nullable: true })
  confidenceInterval?: number;

  @Column('jsonb', { nullable: true })
  metadata?: {
    calculationMethod?: string;
    filters?: Record<string, any>;
    aggregationPeriod?: string;
    baseline?: number;
    improvement?: number;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
