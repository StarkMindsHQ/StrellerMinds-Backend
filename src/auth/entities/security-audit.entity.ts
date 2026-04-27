import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

export enum SecurityEvent {
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  LOGOUT = 'logout',
  PASSWORD_CHANGE = 'password_change',
  TWO_FACTOR_ENABLE = 'two_factor_enable',
  TWO_FACTOR_DISABLE = 'two_factor_disable',
  ACCOUNT_LOCKED = 'account_locked',
  PASSWORD_RESET_REQUEST = 'password_reset_request',
  PASSWORD_RESET_SUCCESS = 'password_reset_success',
  PASSWORD_RESET_FAILED = 'password_reset_failed',
}

/**
 * Indexes:
 *  - userId    → FK; fetch audit trail for a specific user
 *  - event     → filter by event type (e.g. all LOGIN_FAILED in a window)
 *  - createdAt → time-range queries for security dashboards / alerting
 *  - (userId, createdAt) composite → "all events for user X after time T"
 */
import { encryptionTransformer } from '../../common/encryption.transformer';

@Index('IDX_security_audit_userId', ['userId'])
@Index('IDX_security_audit_event', ['event'])
@Index('IDX_security_audit_createdAt', ['createdAt'])
@Index('IDX_security_audit_userId_createdAt', ['userId', 'createdAt'])
@Entity('security_audits')
export class SecurityAudit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: SecurityEvent,
  })
  event: SecurityEvent;

  @Column({ nullable: true, transformer: encryptionTransformer })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column({ type: 'text', nullable: true, transformer: encryptionTransformer })
  metadata: any;

  @CreateDateColumn()
  createdAt: Date;
}
