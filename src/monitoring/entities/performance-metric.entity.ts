import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum MetricType {
  HTTP_REQUEST = 'http_request',
  DATABASE_QUERY = 'database_query',
  CACHE_OPERATION = 'cache_operation',
  EXTERNAL_API = 'external_api',
  BACKGROUND_JOB = 'background_job',
  CUSTOM = 'custom',
}

export enum MetricSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

@Entity('performance_metrics')
@Index(['timestamp', 'type'])
@Index(['endpoint', 'method'])
@Index(['severity'])
export class PerformanceMetric {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: MetricType })
  type: MetricType;

  @Column({ nullable: true })
  endpoint?: string;

  @Column({ nullable: true })
  method?: string;

  @Column({ type: 'float' })
  duration: number; // in milliseconds

  @Column({ type: 'int', nullable: true })
  statusCode?: number;

  @Column({ type: 'enum', enum: MetricSeverity, default: MetricSeverity.LOW })
  severity: MetricSeverity;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  query?: string;

  @Column({ type: 'int', nullable: true })
  rowsAffected?: number;

  @Column({ type: 'int', nullable: true })
  cacheHit?: number;

  @Column({ type: 'int', nullable: true })
  cacheMiss?: number;

  @Column({ type: 'bigint', nullable: true })
  memoryUsage?: number;

  @Column({ type: 'float', nullable: true })
  cpuUsage?: number;

  @CreateDateColumn()
  timestamp: Date;

  @Column({ nullable: true })
  userId?: string;

  @Column({ nullable: true })
  requestId?: string;
}
