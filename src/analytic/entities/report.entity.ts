import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ReportType {
  SCHEDULED = 'scheduled',
  ON_DEMAND = 'on_demand',
  REAL_TIME = 'real_time',
}

export enum ReportFormat {
  JSON = 'json',
  CSV = 'csv',
  PDF = 'pdf',
  EXCEL = 'excel',
}

@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('text', { nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: ReportType,
  })
  type: ReportType;

  @Column({
    type: 'enum',
    enum: ReportFormat,
    default: ReportFormat.JSON,
  })
  format: ReportFormat;

  @Column('jsonb')
  configuration: {
    metrics: string[];
    filters: Record<string, any>;
    groupBy: string[];
    timeRange: {
      start: string;
      end: string;
    };
    aggregations: Record<string, string>;
  };

  @Column('jsonb', { nullable: true })
  schedule?: {
    cron: string;
    timezone: string;
    recipients: string[];
  };

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  createdBy?: string;

  @Column({ type: 'timestamp', nullable: true })
  lastExecuted?: Date;

  @Column('jsonb', { nullable: true })
  lastResult?: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
