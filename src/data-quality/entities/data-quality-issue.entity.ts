import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum IssueStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
  IGNORED = 'ignored',
}

export enum IssuePriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

@Entity('data_quality_issues')
@Index(['status', 'priority'])
@Index(['entityType', 'ruleId'])
@Index(['createdAt', 'status'])
export class DataQualityIssue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  ruleId: string;

  @Column()
  entityType: string;

  @Column({ nullable: true })
  entityId?: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column({
    type: 'enum',
    enum: IssueStatus,
    default: IssueStatus.OPEN,
  })
  status: IssueStatus;

  @Column({
    type: 'enum',
    enum: IssuePriority,
    default: IssuePriority.MEDIUM,
  })
  priority: IssuePriority;

  @Column('jsonb')
  issueData: Record<string, any>;

  @Column('jsonb', { nullable: true })
  context?: Record<string, any>;

  @Column('text', { nullable: true })
  resolution?: string;

  @Column({ nullable: true })
  assignedTo?: string;

  @Column({ nullable: true })
  resolvedBy?: string;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt?: Date;

  @Column({ default: 0 })
  occurrenceCount: number;

  @Column({ type: 'timestamp' })
  firstOccurrence: Date;

  @Column({ type: 'timestamp' })
  lastOccurrence: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
