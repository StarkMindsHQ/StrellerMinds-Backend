import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum IntegrationType {
  LTI = 'lti',
  ZOOM = 'zoom',
  GOOGLE = 'google',
  MICROSOFT = 'microsoft',
  SSO = 'sso',
}

export enum IntegrationStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
}

@Entity('integration_configs')
@Index(['userId', 'integrationType'], { unique: true })
export class IntegrationConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column({
    type: 'enum',
    enum: IntegrationType,
  })
  integrationType: IntegrationType;

  @Column({
    type: 'enum',
    enum: IntegrationStatus,
    default: IntegrationStatus.PENDING,
  })
  status: IntegrationStatus;

  @Column('jsonb')
  credentials: Record<string, any>;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @Column('text', { nullable: true })
  externalId: string;

  @Column('text', { nullable: true })
  displayName: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column('timestamp', { nullable: true })
  lastSyncAt: Date;

  @Column('text', { nullable: true })
  lastSyncStatus: string;

  @Column({ default: true })
  isActive: boolean;

  @Column('int', { default: 0 })
  syncCount: number;

  @Column('timestamp', { nullable: true })
  expiresAt: Date;
}
