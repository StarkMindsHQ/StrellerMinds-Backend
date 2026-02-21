import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { ExportFormat } from './report-schedule.entity';

@Entity('generated_reports')
export class GeneratedReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  templateId: string;

  @Column({ nullable: true })
  scheduleId: string;

  @Column()
  fileUrl: string;

  @Column({ type: 'enum', enum: ExportFormat })
  format: ExportFormat;

  @Column({ type: 'int' })
  rowCount: number;

  @CreateDateColumn()
  generatedAt: Date;
}