import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { AccessibilityViolation } from './accessibility-violation.entity';

export enum AuditStatus {
  PASSED = 'passed',
  FAILED = 'failed',
  WARNING = 'warning',
}

export enum AuditType {
  WCAG_COMPLIANCE = 'wcag_compliance',
  KEYBOARD_NAVIGATION = 'keyboard_navigation',
  SCREEN_READER = 'screen_reader',
  COLOR_CONTRAST = 'color_contrast',
  FORM_ACCESSIBILITY = 'form_accessibility',
  FULL_AUDIT = 'full_audit',
}

@Entity('accessibility_audits')
@Index(['userId', 'createdAt'])
@Index(['status', 'type'])
@Index(['url', 'createdAt'])
export class AccessibilityAudit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  userId?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column()
  url: string;

  @Column({ type: 'enum', enum: AuditType })
  type: AuditType;

  @Column({ type: 'enum', enum: AuditStatus })
  status: AuditStatus;

  @Column({ type: 'int', default: 0 })
  totalIssues: number;

  @Column({ type: 'int', default: 0 })
  criticalIssues: number;

  @Column({ type: 'int', default: 0 })
  seriousIssues: number;

  @Column({ type: 'int', default: 0 })
  moderateIssues: number;

  @Column({ type: 'int', default: 0 })
  minorIssues: number;

  @Column({ type: 'float', nullable: true })
  accessibilityScore?: number;

  @Column({ type: 'boolean', default: false })
  wcag21AACompliant: boolean;

  @Column({ type: 'jsonb' })
  auditResults: any; // Store detailed audit results

  @Column({ type: 'jsonb', nullable: true })
  recommendations?: string[];

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @OneToMany(() => AccessibilityViolation, (violation) => violation.audit)
  violations: AccessibilityViolation[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
