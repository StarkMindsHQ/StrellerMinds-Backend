import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { ReportSchedule } from './report-schedule.entity';
import { GeneratedReport } from './generated-report.entity';

export enum ReportType {
  USER_ENGAGEMENT = 'USER_ENGAGEMENT',
  FINANCIAL = 'FINANCIAL',
  COURSE_PERFORMANCE = 'COURSE_PERFORMANCE',
  SYSTEM_HEALTH = 'SYSTEM_HEALTH',
  CUSTOM = 'CUSTOM',
}

export enum VisualizationType {
  TABLE = 'TABLE',
  BAR_CHART = 'BAR_CHART',
  LINE_CHART = 'LINE_CHART',
  PIE_CHART = 'PIE_CHART',
}

@Entity('report_templates')
export class ReportTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'enum', enum: ReportType })
  type: ReportType;

  @Column({ type: 'jsonb' })
  configuration: {
    metrics: string[];
    dimensions: string[];
    filters: Record<string, any>;
    visualization: VisualizationType;
  };

  @Column()
  ownerId: string;

  @OneToMany(() => ReportSchedule, (schedule) => schedule.template)
  schedules: ReportSchedule[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}