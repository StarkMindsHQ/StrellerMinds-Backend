import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum RuleType {
  COMPLETENESS = 'completeness',
  ACCURACY = 'accuracy',
  CONSISTENCY = 'consistency',
  VALIDITY = 'validity',
  UNIQUENESS = 'uniqueness',
  TIMELINESS = 'timeliness',
  CONFORMITY = 'conformity',
}

export enum RuleSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum RuleStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DRAFT = 'draft',
  DEPRECATED = 'deprecated',
}

@Entity('data_quality_rules')
@Index(['entityType', 'status'])
@Index(['ruleType', 'severity'])
export class DataQualityRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('text')
  description: string;

  @Column({
    type: 'enum',
    enum: RuleType,
  })
  ruleType: RuleType;

  @Column({
    type: 'enum',
    enum: RuleSeverity,
    default: RuleSeverity.MEDIUM,
  })
  severity: RuleSeverity;

  @Column({
    type: 'enum',
    enum: RuleStatus,
    default: RuleStatus.ACTIVE,
  })
  status: RuleStatus;

  @Column()
  entityType: string;

  @Column('jsonb')
  conditions: Record<string, any>;

  @Column('jsonb', { nullable: true })
  parameters?: Record<string, any>;

  @Column('text', { nullable: true })
  sqlQuery?: string;

  @Column('text', { nullable: true })
  errorMessage?: string;

  @Column({ default: 0 })
  threshold: number;

  @Column({ default: false })
  autoFix: boolean;

  @Column('jsonb', { nullable: true })
  fixActions?: Record<string, any>;

  @Column({ nullable: true })
  createdBy?: string;

  @Column({ nullable: true })
  updatedBy?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
