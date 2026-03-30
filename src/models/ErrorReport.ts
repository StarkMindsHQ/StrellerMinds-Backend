import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, Index } from 'typeorm';
import { User } from '../user/user.entity';

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  SYSTEM = 'system',
  DATABASE = 'database',
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  BUSINESS_LOGIC = 'business_logic',
  EXTERNAL_SERVICE = 'external_service',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  USER_INTERFACE = 'user_interface'
}

export enum ErrorStatus {
  OPEN = 'open',
  INVESTIGATING = 'investigating',
  IDENTIFIED = 'identified',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
  FALSE_POSITIVE = 'false_positive'
}

export enum RecoveryAction {
  RETRY = 'retry',
  CIRCUIT_BREAKER = 'circuit_breaker',
  FALLBACK = 'fallback',
  CACHE_INVALIDATION = 'cache_invalidation',
  SERVICE_RESTART = 'service_restart',
  MANUAL_INTERVENTION = 'manual_intervention',
  IGNORE = 'ignore',
  ESCALATE = 'escalate'
}

@Entity('error_reports')
@Index(['status', 'severity'])
@Index(['category', 'createdAt'])
@Index(['correlationId'])
export class ErrorReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  correlationId: string;

  @Column()
  message: string;

  @Column('text')
  stackTrace: string;

  @Column({ type: 'enum', enum: ErrorSeverity })
  severity: ErrorSeverity;

  @Column({ type: 'enum', enum: ErrorCategory })
  category: ErrorCategory;

  @Column({ type: 'enum', enum: ErrorStatus, default: ErrorStatus.OPEN })
  status: ErrorStatus;

  @Column({ nullable: true })
  service: string;

  @Column({ nullable: true })
  endpoint: string;

  @Column({ nullable: true })
  method: string;

  @Column({ type: 'json', nullable: true })
  context: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @Column({ nullable: true })
  userId: string;

  @Column({ nullable: true })
  sessionId: string;

  @Column({ nullable: true })
  requestId: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ type: 'json', nullable: true })
  recoveryActions: RecoveryAction[];

  @Column({ nullable: true })
  recoveryAttempted: boolean;

  @Column({ nullable: true })
  recoverySuccessful: boolean;

  @Column({ type: 'json', nullable: true })
  recoveryDetails: Record<string, any>;

  @Column({ nullable: true })
  assignedTo: string;

  @Column({ type: 'json', nullable: true })
  tags: string[];

  @Column({ nullable: true })
  duplicateOf: string;

  @Column({ default: 0 })
  occurrenceCount: number;

  @Column({ type: 'json', nullable: true })
  similarErrors: string[];

  @ManyToOne(() => User)
  reportedBy: User;

  @ManyToOne(() => User)
  resolvedBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  resolvedAt: Date;

  @Column({ nullable: true })
  firstOccurrenceAt: Date;

  @Column({ nullable: true })
  lastOccurrenceAt: Date;

  @Column({ nullable: true })
  timeToResolution: number; // in minutes

  @Column({ default: false })
  isRecurring: boolean;

  @Column({ default: false })
  isSilenced: boolean;

  @Column({ nullable: true })
  silencedUntil: Date;

  @Column({ nullable: true })
  escalationLevel: number;

  @Column({ type: 'json', nullable: true })
  customFields: Record<string, any>;

  @OneToMany(() => ErrorComment, 'errorReport')
  comments: ErrorComment[];

  @OneToMany(() => ErrorAttachment, 'errorReport')
  attachments: ErrorAttachment[];
}

@Entity('error_comments')
export class ErrorComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ErrorReport)
  errorReport: ErrorReport;

  @Column('text')
  content: string;

  @Column({ default: false })
  isInternal: boolean;

  @ManyToOne(() => User)
  author: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('error_attachments')
export class ErrorAttachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ErrorReport)
  errorReport: ErrorReport;

  @Column()
  filename: string;

  @Column()
  mimeType: string;

  @Column('bigint')
  size: number;

  @Column()
  url: string;

  @ManyToOne(() => User)
  uploadedBy: User;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('error_patterns')
export class ErrorPattern {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  pattern: string;

  @Column({ type: 'enum', enum: ErrorCategory })
  category: ErrorCategory;

  @Column({ type: 'enum', enum: ErrorSeverity, default: ErrorSeverity.MEDIUM })
  defaultSeverity: ErrorSeverity;

  @Column({ type: 'json', nullable: true })
  suggestedRecoveryActions: RecoveryAction[];

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  matchCount: number;

  @Column({ type: 'json', nullable: true })
  examples: Array<{
    message: string;
    stackTrace: string;
    matchedAt: Date;
  }>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User)
  createdBy: User;

  @ManyToOne(() => User)
  updatedBy: User;
}

@Entity('error_incidents')
export class ErrorIncident {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column({ type: 'enum', enum: ErrorSeverity })
  severity: ErrorSeverity;

  @Column({ type: 'enum', enum: ErrorStatus, default: ErrorStatus.OPEN })
  status: ErrorStatus;

  @Column({ type: 'json', nullable: true })
  affectedServices: string[];

  @Column({ type: 'json', nullable: true })
  affectedUsers: string[];

  @Column({ default: 0 })
  errorCount: number;

  @Column({ type: 'json', nullable: true })
  errorReports: string[];

  @Column({ type: 'json', nullable: true })
  impactAssessment: {
    userImpact: string;
    businessImpact: string;
    revenueImpact?: number;
    estimatedDowntime?: number;
  };

  @Column({ type: 'json', nullable: true })
  resolutionPlan: {
    steps: string[];
    estimatedTime: number;
    assignee: string;
    priority: number;
  };

  @Column({ nullable: true })
  rootCause: string;

  @Column({ nullable: true })
  preventionMeasures: string;

  @Column({ type: 'json', nullable: true })
  timeline: Array<{
    timestamp: Date;
    action: string;
    performedBy: string;
    details: string;
  }>;

  @ManyToOne(() => User)
  createdBy: User;

  @ManyToOne(() => User)
  assignedTo: User;

  @ManyToOne(() => User)
  resolvedBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  resolvedAt: Date;

  @Column({ nullable: true })
  detectedAt: Date;

  @Column({ nullable: true })
  acknowledgedAt: Date;

  @Column({ default: false })
  isPublic: boolean;

  @Column({ type: 'json', nullable: true })
  communicationUpdates: Array<{
    timestamp: Date;
    message: string;
    channel: string;
    audience: string;
  }>;
}

@Entity('error_recovery_logs')
export class ErrorRecoveryLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ErrorReport)
  errorReport: ErrorReport;

  @Column({ type: 'enum', enum: RecoveryAction })
  action: RecoveryAction;

  @Column({ default: false })
  successful: boolean;

  @Column({ type: 'json', nullable: true })
  parameters: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  result: Record<string, any>;

  @Column({ nullable: true })
  errorMessage: string;

  @Column({ type: 'bigint', nullable: true })
  executionTime: number; // in milliseconds

  @Column({ nullable: true })
  attemptNumber: number;

  @ManyToOne(() => User)
  performedBy: User;

  @CreateDateColumn()
  createdAt: Date;
}
