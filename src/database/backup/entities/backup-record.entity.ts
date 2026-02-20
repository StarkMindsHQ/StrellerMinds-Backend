import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

export enum BackupType {
  FULL = 'full',
  INCREMENTAL = 'incremental',
  WAL = 'wal',
  SNAPSHOT = 'snapshot',
}

export enum BackupStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  VERIFIED = 'verified',
  REPLICATED = 'replicated',
  DELETED = 'deleted',
}

export enum StorageLocation {
  LOCAL = 'local',
  S3_PRIMARY = 's3_primary',
  S3_REPLICA = 's3_replica',
}

export enum RetentionTier {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

@Entity('backup_records')
export class BackupRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  @Index()
  filename: string;

  @Column({ type: 'enum', enum: BackupType, default: BackupType.FULL })
  @Index()
  type: BackupType;

  @Column({ type: 'enum', enum: BackupStatus, default: BackupStatus.PENDING })
  @Index()
  status: BackupStatus;

  @Column({ type: 'bigint', default: 0 })
  sizeBytes: number;

  @Column({ type: 'bigint', nullable: true })
  compressedSizeBytes: number;

  @Column({ type: 'varchar', length: 64, nullable: true })
  checksumSha256: string;

  @Column({ type: 'boolean', default: false })
  isEncrypted: boolean;

  @Column({ type: 'varchar', length: 64, nullable: true })
  encryptionKeyId: string;

  @Column({ type: 'boolean', default: false })
  isCompressed: boolean;

  @Column({ type: 'simple-array', nullable: true })
  storageLocations: StorageLocation[];

  @Column({ type: 'varchar', nullable: true })
  localPath: string;

  @Column({ type: 'varchar', nullable: true })
  s3PrimaryKey: string;

  @Column({ type: 'varchar', nullable: true })
  s3ReplicaKey: string;

  @Column({ type: 'varchar', nullable: true })
  s3PrimaryBucket: string;

  @Column({ type: 'varchar', nullable: true })
  s3ReplicaBucket: string;

  @Column({ type: 'int', default: 0 })
  durationMs: number;

  @Column({ type: 'varchar', nullable: true })
  databaseVersion: string;

  @Column({ type: 'varchar', nullable: true })
  postgresVersion: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'int', default: 0 })
  retryCount: number;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  replicatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ type: 'enum', enum: RetentionTier, nullable: true })
  retentionTier: RetentionTier;

  @Column({ type: 'varchar', nullable: true })
  scheduleId: string;

  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt: Date;
}
