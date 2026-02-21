import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

export enum ApiKeyStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  REVOKED = 'revoked',
}

export enum ApiKeyTier {
  FREE = 'free',
  BASIC = 'basic',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
}

@Entity('api_keys')
@Index(['key', 'status'])
@Index(['userId', 'status'])
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  key: string; // Hashed API key

  @Column({ nullable: true })
  keyPrefix: string; // First 8 characters for display

  @Column({ type: 'enum', enum: ApiKeyStatus, default: ApiKeyStatus.ACTIVE })
  status: ApiKeyStatus;

  @Column({ type: 'enum', enum: ApiKeyTier, default: ApiKeyTier.FREE })
  tier: ApiKeyTier;

  @Column({ type: 'int', default: 1000 })
  rateLimit: number; // Requests per hour

  @Column({ type: 'jsonb', nullable: true })
  allowedIps?: string[];

  @Column({ type: 'jsonb', nullable: true })
  allowedOrigins?: string[];

  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt?: Date;

  @Column({ type: 'bigint', default: 0 })
  requestCount: number;

  @Column({ type: 'bigint', default: 0 })
  totalRequests: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
