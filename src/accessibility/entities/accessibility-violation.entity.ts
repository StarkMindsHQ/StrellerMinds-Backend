import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { AccessibilityAudit } from './accessibility-audit.entity';

export enum ViolationSeverity {
  CRITICAL = 'critical',
  SERIOUS = 'serious',
  MODERATE = 'moderate',
  MINOR = 'minor',
}

@Entity('accessibility_violations')
@Index(['auditId', 'severity'])
@Index(['wcagCriteria'])
export class AccessibilityViolation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  auditId: string;

  @ManyToOne(() => AccessibilityAudit, (audit) => audit.violations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'auditId' })
  audit: AccessibilityAudit;

  @Column()
  type: string;

  @Column({ type: 'enum', enum: ViolationSeverity })
  severity: ViolationSeverity;

  @Column({ type: 'text' })
  description: string;

  @Column({ nullable: true })
  wcagCriteria?: string;

  @Column({ type: 'text', nullable: true })
  recommendation?: string;

  @Column({ nullable: true })
  element?: string;

  @Column({ nullable: true })
  selector?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
