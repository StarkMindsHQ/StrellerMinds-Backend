import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ReportType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  CUSTOM = 'custom',
}

export enum ReportStatus {
  PENDING = 'pending',
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('performance_reports')
export class PerformanceReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: ReportType })
  type: ReportType;

  @Column({ type: 'enum', enum: ReportStatus, default: ReportStatus.PENDING })
  status: ReportStatus;

  @Column({ type: 'timestamp' })
  startDate: Date;

  @Column({ type: 'timestamp' })
  endDate: Date;

  @Column({ type: 'jsonb' })
  metrics: {
    totalRequests: number;
    averageResponseTime: number;
    p50: number;
    p95: number;
    p99: number;
    errorRate: number;
    throughput: number;
    slowQueries: number;
    cacheHitRate: number;
    databaseConnections: number;
    memoryUsage: {
      average: number;
      peak: number;
    };
    cpuUsage: {
      average: number;
      peak: number;
    };
  };

  @Column({ type: 'jsonb', nullable: true })
  recommendations?: Array<{
    category: string;
    priority: string;
    description: string;
    impact: string;
    action: string;
  }>;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
