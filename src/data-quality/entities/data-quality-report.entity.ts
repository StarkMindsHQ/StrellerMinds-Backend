import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum ReportType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  ADHOC = 'adhoc',
}

export enum ReportStatus {
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('data_quality_reports')
@Index(['reportType', 'createdAt'])
@Index(['status', 'createdAt'])
export class DataQualityReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: ReportType,
  })
  reportType: ReportType;

  @Column({
    type: 'enum',
    enum: ReportStatus,
    default: ReportStatus.GENERATING,
  })
  status: ReportStatus;

  @Column({ type: 'timestamp' })
  reportDate: Date;

  @Column({ type: 'timestamp' })
  startDate: Date;

  @Column({ type: 'timestamp' })
  endDate: Date;

  @Column('jsonb')
  summary: Record<string, any>;

  @Column('jsonb')
  metrics: Record<string, any>;

  @Column('jsonb', { nullable: true })
  issues?: Record<string, any>;

  @Column('jsonb', { nullable: true })
  recommendations?: Record<string, any>;

  @Column('text', { nullable: true })
  filePath?: string;

  @Column({ nullable: true })
  generatedBy?: string;

  @CreateDateColumn()
  createdAt: Date;
}
