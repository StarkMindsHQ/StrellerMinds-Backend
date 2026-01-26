import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('analytics_reports')
export class AnalyticsReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('jsonb')
  config: any;

  @Column({ default: false })
  scheduled: boolean;

  @Column({ nullable: true })
  cronExpression?: string;

  @CreateDateColumn()
  createdAt: Date;
}
