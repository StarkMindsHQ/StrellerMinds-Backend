import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { IntegrationConfig } from './integration-config.entity';

export enum SyncStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  SUCCESS = 'success',
  FAILED = 'failed',
  PARTIAL = 'partial',
}

export enum SyncDirection {
  PUSH = 'push',
  PULL = 'pull',
  BIDIRECTIONAL = 'bidirectional',
}

@Entity('sync_logs')
@Index(['integrationConfigId', 'createdAt'], { order: { createdAt: 'DESC' } })
@Index(['status', 'createdAt'])
export class SyncLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  integrationConfigId: string;

  @ManyToOne(() => IntegrationConfig, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'integrationConfigId' })
  integrationConfig: IntegrationConfig;

  @Column({
    type: 'enum',
    enum: SyncStatus,
    default: SyncStatus.PENDING,
  })
  status: SyncStatus;

  @Column({
    type: 'enum',
    enum: SyncDirection,
  })
  direction: SyncDirection;

  @Column('text', { nullable: true })
  resourceType: string;

  @Column('int', { default: 0 })
  itemsProcessed: number;

  @Column('int', { default: 0 })
  itemsFailed: number;

  @Column('text', { nullable: true })
  errorMessage: string;

  @Column('jsonb', { nullable: true })
  syncData: Record<string, any>;

  @CreateDateColumn()
  startedAt: Date;

  @Column('timestamp', { nullable: true })
  completedAt: Date;

  @Column('int', { nullable: true })
  durationMs: number;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;
}
