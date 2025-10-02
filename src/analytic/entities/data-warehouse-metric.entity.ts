import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary',
}

export enum AggregationType {
  SUM = 'sum',
  AVG = 'avg',
  COUNT = 'count',
  MIN = 'min',
  MAX = 'max',
}

@Entity('data_warehouse_metrics')
@Index(['metricName', 'timestamp'])
@Index(['metricType', 'timestamp'])
@Index(['dimensions', 'timestamp'])
export class DataWarehouseMetric {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  metricName: string;

  @Column({
    type: 'enum',
    enum: MetricType,
  })
  metricType: MetricType;

  @Column('decimal', { precision: 15, scale: 4 })
  value: number;

  @Column('jsonb')
  dimensions: Record<string, string>;

  @Column('jsonb', { nullable: true })
  tags?: Record<string, string>;

  @Column({ type: 'timestamp' })
  timestamp: Date;

  @Column({
    type: 'enum',
    enum: AggregationType,
    default: AggregationType.SUM,
  })
  aggregationType: AggregationType;

  @Column({ default: '1h' })
  granularity: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
