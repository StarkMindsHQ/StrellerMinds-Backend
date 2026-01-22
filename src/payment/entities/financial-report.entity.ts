import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('financial_reports')
export class FinancialReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar')
  reportType: string; // 'revenue', 'expenses', 'tax', 'reconciliation'

  @Column('varchar', { nullable: true })
  period: string; // 'monthly', 'quarterly', 'annual'

  @Column('date')
  startDate: Date;

  @Column('date')
  endDate: Date;

  @Column('decimal', { precision: 15, scale: 2 })
  totalRevenue: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  totalRefunds: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  totalDisputes: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  totalTax: number;

  @Column('decimal', { precision: 15, scale: 2 })
  netRevenue: number;

  @Column('int', { default: 0 })
  transactionCount: number;

  @Column('int', { default: 0 })
  subscriptionCount: number;

  @Column('int', { default: 0 })
  refundCount: number;

  @Column('json', { nullable: true })
  summary: Record<string, any>;

  @Column('json', { nullable: true })
  breakdown: Record<string, any>;

  @Column('varchar', { default: 'pending' })
  status: string; // 'pending', 'completed', 'audited'

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column('timestamp', { nullable: true })
  generatedAt: Date;
}
