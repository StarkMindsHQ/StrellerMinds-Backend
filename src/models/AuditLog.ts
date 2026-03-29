import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../auth/entities/user.entity';

export enum AuditAction {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  EXPORT = 'EXPORT',
  IMPORT = 'IMPORT',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  ARCHIVE = 'ARCHIVE',
  RESTORE = 'RESTORE',
}

export enum AuditResourceType {
  USER = 'USER',
  COURSE = 'COURSE',
  ASSIGNMENT = 'ASSIGNMENT',
  SUBMISSION = 'SUBMISSION',
  GRADE = 'GRADE',
  ENROLLMENT = 'ENROLLMENT',
  PAYMENT = 'PAYMENT',
  SYSTEM = 'SYSTEM',
  API_KEY = 'API_KEY',
  CONFIGURATION = 'CONFIGURATION',
  AUDIT_LOG = 'AUDIT_LOG',
}

export enum AuditSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

@Entity('audit_logs')
@Index(['userId', 'createdAt'])
@Index(['resourceType', 'action'])
@Index(['severity', 'createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: AuditAction,
  })
  action: AuditAction;

  @Column({
    type: 'enum',
    enum: AuditResourceType,
  })
  resourceType: AuditResourceType;

  @Column({ nullable: true })
  resourceId: string;

  @Column({
    type: 'enum',
    enum: AuditSeverity,
    default: AuditSeverity.LOW,
  })
  severity: AuditSeverity;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column({ type: 'jsonb', nullable: true })
  oldValues: any;

  @Column({ type: 'jsonb', nullable: true })
  newValues: any;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @Column({ nullable: true })
  sessionId: string;

  @Column({ nullable: true })
  correlationId: string;

  @Column({ default: false })
  isComplianceRelevant: boolean;

  @Column({ type: 'timestamp', nullable: true })
  retentionUntil: Date;

  @Column({ default: false })
  isArchived: boolean;

  @Column({ nullable: true })
  archivedAt: Date;

  @Column({ nullable: true })
  archivedBy: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  category: string;

  @Column({ type: 'text', nullable: true })
  subcategory: string;

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  deviceId: string;

  @Column({ type: 'jsonb', nullable: true })
  gdprData: any;

  @CreateDateColumn()
  createdAt: Date;
}
