import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

export enum ReportType {
  USER_ENGAGEMENT = 'user_engagement',
  FINANCIAL = 'financial',
  COURSE_PERFORMANCE = 'course_performance',
  SYSTEM_HEALTH = 'system_health',
  CUSTOM = 'custom',
}

export enum ReportStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('analytics_reports')
@Index(['createdById', 'createdAt'])
@Index(['reportType', 'status'])
export class AnalyticsReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: ReportType })
  reportType: ReportType;

  @Column({ type: 'enum', enum: ReportStatus, default: ReportStatus.PENDING })
  status: ReportStatus;

  @Column({ type: 'jsonb' })
  configuration: {
    metrics: string[];
    dimensions: string[];
    filters: Record<string, any>;
    dateRange: {
      start: string;
      end: string;
    };
    groupBy?: string[];
    orderBy?: { field: string; direction: 'ASC' | 'DESC' }[];
  };

  @Column({ type: 'jsonb', nullable: true })
  data: any;

  @Column({ type: 'jsonb', nullable: true })
  visualizations: {
    type: string;
    config: Record<string, any>;
  }[];

  @Column({ type: 'jsonb', nullable: true })
  insights: {
    type: string;
    message: string;
    severity: 'info' | 'warning' | 'critical';
    data?: any;
  }[];

  @Column({ name: 'created_by_id' })
  createdById: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
