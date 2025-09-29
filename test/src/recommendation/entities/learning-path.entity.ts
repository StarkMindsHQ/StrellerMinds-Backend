import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Course } from '../../courses/entities/course.entity';

export enum LearningPathStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  PAUSED = 'paused',
  ARCHIVED = 'archived',
}

export enum LearningPathType {
  SYSTEM_GENERATED = 'system_generated',
  USER_CREATED = 'user_created',
  CURATED = 'curated',
  ADAPTIVE = 'adaptive',
}

@Entity('learning_paths')
@Index(['userId', 'status'])
@Index(['type', 'status'])
@Index(['createdAt'])
export class LearningPath {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 255 })
  title: string;

  @Column('text', { nullable: true })
  description?: string;

  @Column('uuid')
  @Index()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: LearningPathType,
    default: LearningPathType.SYSTEM_GENERATED,
  })
  type: LearningPathType;

  @Column({
    type: 'enum',
    enum: LearningPathStatus,
    default: LearningPathStatus.DRAFT,
  })
  status: LearningPathStatus;

  @OneToMany(() => LearningPathStep, (step) => step.learningPath, {
    cascade: true,
    eager: true,
  })
  steps: LearningPathStep[];

  @Column('simple-array', { nullable: true })
  tags?: string[];

  @Column('simple-array', { nullable: true })
  skills?: string[];

  @Column('varchar', { length: 50, nullable: true })
  difficulty?: string;

  @Column('int', { nullable: true })
  estimatedDurationHours?: number;

  @Column('decimal', { precision: 3, scale: 2, default: 0.0 })
  progress: number;

  @Column('jsonb', { nullable: true })
  metadata?: {
    algorithmVersion?: string;
    generationReason?: string;
    adaptiveParameters?: Record<string, any>;
    userPreferences?: Record<string, any>;
    skillGaps?: string[];
    learningObjectives?: string[];
  };

  @Column('timestamp', { nullable: true })
  startedAt?: Date;

  @Column('timestamp', { nullable: true })
  completedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Virtual properties
  get isCompleted(): boolean {
    return this.status === LearningPathStatus.COMPLETED;
  }

  get isActive(): boolean {
    return this.status === LearningPathStatus.ACTIVE;
  }

  get completedSteps(): number {
    return this.steps?.filter((step) => step.isCompleted).length || 0;
  }

  get totalSteps(): number {
    return this.steps?.length || 0;
  }

  get progressPercentage(): number {
    if (this.totalSteps === 0) return 0;
    return Math.round((this.completedSteps / this.totalSteps) * 100);
  }
}

@Entity('learning_path_steps')
@Index(['learningPathId', 'order'])
@Index(['courseId'])
export class LearningPathStep {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  learningPathId: string;

  @ManyToOne(() => LearningPath, (path) => path.steps, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'learningPathId' })
  learningPath: LearningPath;

  @Column('uuid', { nullable: true })
  courseId?: string;

  @ManyToOne(() => Course, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course?: Course;

  @Column('varchar', { length: 255 })
  title: string;

  @Column('text', { nullable: true })
  description?: string;

  @Column('int')
  order: number;

  @Column('boolean', { default: false })
  isCompleted: boolean;

  @Column('boolean', { default: false })
  isOptional: boolean;

  @Column('boolean', { default: false })
  isUnlocked: boolean;

  @Column('simple-array', { nullable: true })
  prerequisites?: string[];

  @Column('int', { nullable: true })
  estimatedDurationMinutes?: number;

  @Column('jsonb', { nullable: true })
  metadata?: {
    difficulty?: string;
    skills?: string[];
    learningObjectives?: string[];
    resources?: Array<{
      type: string;
      url: string;
      title: string;
    }>;
  };

  @Column('timestamp', { nullable: true })
  startedAt?: Date;

  @Column('timestamp', { nullable: true })
  completedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
