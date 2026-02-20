import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
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
}

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

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @CreateDateColumn()
  createdAt: Date;
}
