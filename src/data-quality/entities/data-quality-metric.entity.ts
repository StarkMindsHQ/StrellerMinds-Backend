import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum MetricCategory {
  COMPLETENESS = 'completeness',
  ACCURACY = 'accuracy',
  CONSISTENCY = 'consistency',
  VALIDITY = 'validity',
  UNIQUENESS = 'uniqueness',
  TIMELINESS = 'timeliness',
  OVERALL = 'overall',
}

@Entity('data_quality_metrics')
@Index(['entityType', 'metricCategory', 'timestamp'])
@Index(['ruleId', 'timestamp'])
export class DataQualityMetric {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  ruleId?: string;

  @Column()
  entityType: string;

  @Column({
    type: 'enum',
    enum: MetricCategory,
  })
  metricCategory: MetricCategory;

  @Column()
  metricName: string;

  @Column('decimal', { precision: 10, scale: 4 })
  value: number;

  @Column('decimal', { precision: 10, scale: 4, nullable: true })
  threshold?: number;

  @Column({ default: true })
  passed: boolean;

  @Column('jsonb', { nullable: true })
  details?: Record<string, any>;

  @Column('jsonb', { nullable: true })
  dimensions?: Record<string, string>;

  @Column({ type: 'timestamp' })
  timestamp: Date;

  @Column({ default: '1h' })
  granularity: string;

  @CreateDateColumn()
  createdAt: Date;
}
