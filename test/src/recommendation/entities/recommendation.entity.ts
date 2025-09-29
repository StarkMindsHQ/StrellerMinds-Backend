import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Course } from '../../courses/entities/course.entity';

export enum RecommendationType {
  COURSE = 'course',
  LEARNING_PATH = 'learning_path',
  CONTENT = 'content',
  SKILL_BASED = 'skill_based',
  COLLABORATIVE = 'collaborative',
  CONTENT_BASED = 'content_based',
}

export enum RecommendationReason {
  SIMILAR_USERS = 'similar_users',
  SKILL_GAP = 'skill_gap',
  LEARNING_HISTORY = 'learning_history',
  TRENDING = 'trending',
  PREREQUISITE = 'prerequisite',
  CONTINUATION = 'continuation',
  INTEREST_BASED = 'interest_based',
  DIFFICULTY_MATCH = 'difficulty_match',
}

export enum RecommendationStatus {
  ACTIVE = 'active',
  DISMISSED = 'dismissed',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
}

@Entity('recommendations')
@Index(['userId', 'status', 'createdAt'])
@Index(['recommendationType', 'status'])
@Index(['confidenceScore'])
export class Recommendation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('uuid', { nullable: true })
  courseId?: string;

  @ManyToOne(() => Course, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course?: Course;

  @Column({
    type: 'enum',
    enum: RecommendationType,
    default: RecommendationType.COURSE,
  })
  recommendationType: RecommendationType;

  @Column({
    type: 'enum',
    enum: RecommendationReason,
    default: RecommendationReason.LEARNING_HISTORY,
  })
  reason: RecommendationReason;

  @Column({
    type: 'enum',
    enum: RecommendationStatus,
    default: RecommendationStatus.ACTIVE,
  })
  status: RecommendationStatus;

  @Column('decimal', { precision: 5, scale: 4, default: 0.5 })
  confidenceScore: number;

  @Column('decimal', { precision: 5, scale: 4, default: 0.0 })
  relevanceScore: number;

  @Column('int', { default: 0 })
  priority: number;

  @Column('text', { nullable: true })
  explanation?: string;

  @Column('jsonb', { nullable: true })
  metadata?: {
    algorithmUsed?: string;
    features?: Record<string, any>;
    similarUsers?: string[];
    tags?: string[];
    difficulty?: string;
    estimatedDuration?: number;
    prerequisites?: string[];
    learningObjectives?: string[];
  };

  @Column('jsonb', { nullable: true })
  mlFeatures?: {
    userEmbedding?: number[];
    contentEmbedding?: number[];
    interactionHistory?: Record<string, any>;
    skillVector?: number[];
    preferenceVector?: number[];
  };

  @Column('timestamp', { nullable: true })
  expiresAt?: Date;

  @Column('timestamp', { nullable: true })
  viewedAt?: Date;

  @Column('timestamp', { nullable: true })
  clickedAt?: Date;

  @Column('timestamp', { nullable: true })
  dismissedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Virtual properties
  get isExpired(): boolean {
    return this.expiresAt ? new Date() > this.expiresAt : false;
  }

  get isViewed(): boolean {
    return !!this.viewedAt;
  }

  get isClicked(): boolean {
    return !!this.clickedAt;
  }

  get isDismissed(): boolean {
    return this.status === RecommendationStatus.DISMISSED;
  }

  get ageInDays(): number {
    return Math.floor(
      (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24),
    );
  }
}
