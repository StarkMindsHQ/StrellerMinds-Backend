import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum AggregationPeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export enum AggregationType {
  COURSE_STATS = 'course_stats',
  STUDENT_STATS = 'student_stats',
  INSTRUCTOR_STATS = 'instructor_stats',
  LEARNING_PATH_STATS = 'learning_path_stats',
  PLATFORM_STATS = 'platform_stats',
}

@Entity('analytics_aggregations')
@Index(['entityId', 'aggregationType', 'period'])
@Index(['aggregationType', 'periodStart'])
export class AnalyticsAggregation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  entityId: string; // courseId, userId, instructorId, etc.

  @Column({ type: 'enum', enum: AggregationType })
  aggregationType: AggregationType;

  @Column({ type: 'enum', enum: AggregationPeriod })
  period: AggregationPeriod;

  @Column({ type: 'date' })
  periodStart: Date;

  @Column({ type: 'date' })
  periodEnd: Date;

  @Column({ type: 'jsonb' })
  data: Record<string, any>;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
