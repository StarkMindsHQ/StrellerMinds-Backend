import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ReportTemplate } from './report-template.entity';

export enum ScheduleFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

export enum ExportFormat {
  JSON = 'JSON',
  CSV = 'CSV',
  PDF = 'PDF',
}

@Entity('report_schedules')
export class ReportSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ReportTemplate, (template) => template.schedules, { onDelete: 'CASCADE' })
  template: ReportTemplate;

  @Column({ type: 'enum', enum: ScheduleFrequency })
  frequency: ScheduleFrequency;

  @Column('text', { array: true })
  recipients: string[];

  @Column({ type: 'enum', enum: ExportFormat, default: ExportFormat.CSV })
  format: ExportFormat;

  @Column({ type: 'timestamp', nullable: true })
  lastRun: Date;

  @Column({ type: 'timestamp' })
  nextRun: Date;

  @Column({ default: true })
  isActive: boolean;
}