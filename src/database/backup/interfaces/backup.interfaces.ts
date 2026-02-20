import {
  BackupType,
  BackupStatus,
  StorageLocation,
  RetentionTier,
} from '../entities/backup-record.entity';
import { RecoveryTestStatus } from '../entities/recovery-test.entity';

export interface BackupOptions {
  compress?: boolean;
  verify?: boolean;
}

export interface EnhancedBackupOptions extends BackupOptions {
  encrypt?: boolean;
  encryptionKeyId?: string;
  uploadToS3?: boolean;
  replicateCrossRegion?: boolean;
  backupType?: BackupType;
  scheduleId?: string;
  retentionTier?: RetentionTier;
}

export interface BackupResult {
  success: boolean;
  filename: string;
  size: number;
  duration: number;
  checksum?: string;
  error?: string;
}

export interface EnhancedBackupResult extends BackupResult {
  id: string;
  encrypted: boolean;
  s3Uploaded: boolean;
  replicated: boolean;
  storageLocations: StorageLocation[];
  s3PrimaryKey?: string;
  s3ReplicaKey?: string;
}

export interface BackupStats {
  totalBackups: number;
  totalSizeBytes: number;
  backupsByType: Record<BackupType, number>;
  backupsByStatus: Record<BackupStatus, number>;
  backupsByTier: Record<RetentionTier, number>;
  lastBackupAt: Date | null;
  lastSuccessfulBackupAt: Date | null;
  averageDurationMs: number;
  storageByLocation: Record<StorageLocation, number>;
}

export interface CloudUploadResult {
  bucket: string;
  key: string;
  region: string;
  etag: string;
  versionId?: string;
}

export interface CrossRegionReplicationResult {
  primaryUpload: CloudUploadResult;
  replicaUpload: CloudUploadResult;
}

export interface EncryptionResult {
  encryptedPath: string;
  keyId: string;
  iv: string;
  authTag: string;
}

export interface EncryptionMetadata {
  version: number;
  algorithm: string;
  keyId: string;
  iv: string;
  authTag: string;
  salt: string;
}

export interface RecoveryOptions {
  backupId: string;
  targetDatabase?: string;
  pointInTime?: Date;
  verifyAfterRestore?: boolean;
  fromReplica?: boolean;
}

export interface RecoveryResult {
  success: boolean;
  backupId: string;
  restoredAt: Date;
  durationMs: number;
  tablesRestored: number;
  errors?: string[];
}

export interface RecoveryTestResult {
  testId: string;
  backupId: string;
  status: RecoveryTestStatus;
  durationMs: number;
  checksumVerified: boolean;
  integrityPassed: boolean;
  tablesVerified: number;
  rowsVerified: number;
  errors?: string[];
}

export interface BackupAlertPayload {
  severity: BackupAlertSeverity;
  title: string;
  message: string;
  backupId?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export enum BackupAlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export interface SlackMessage {
  channel?: string;
  username?: string;
  icon_emoji?: string;
  attachments: SlackAttachment[];
}

export interface SlackAttachment {
  color: string;
  title: string;
  text: string;
  fields?: Array<{ title: string; value: string; short?: boolean }>;
  footer?: string;
  ts?: number;
}

export interface BackupMetrics {
  backupOperationsTotal: number;
  backupFailuresTotal: number;
  lastBackupDurationSeconds: number;
  lastBackupSizeBytes: number;
  lastBackupTimestamp: number;
  storageUsedBytes: Record<string, number>;
  recoveryTestStatus: number;
  activeBackups: number;
  pendingBackups: number;
}

export interface RetentionPolicy {
  tier: RetentionTier;
  retentionDays: number;
  criteria: (date: Date) => boolean;
}

export const DEFAULT_RETENTION_POLICIES: RetentionPolicy[] = [
  {
    tier: RetentionTier.YEARLY,
    retentionDays: 2555, // 7 years
    criteria: (date: Date) => date.getMonth() === 0 && date.getDate() === 1,
  },
  {
    tier: RetentionTier.MONTHLY,
    retentionDays: 365, // 12 months
    criteria: (date: Date) => date.getDate() === 1,
  },
  {
    tier: RetentionTier.WEEKLY,
    retentionDays: 84, // 12 weeks
    criteria: (date: Date) => date.getDay() === 0,
  },
  {
    tier: RetentionTier.DAILY,
    retentionDays: 30,
    criteria: () => true, // All other backups
  },
];

export function determineRetentionTier(backupDate: Date): RetentionTier {
  for (const policy of DEFAULT_RETENTION_POLICIES) {
    if (policy.criteria(backupDate)) {
      return policy.tier;
    }
  }
  return RetentionTier.DAILY;
}

export function calculateExpirationDate(backupDate: Date, tier: RetentionTier): Date {
  const policy = DEFAULT_RETENTION_POLICIES.find((p) => p.tier === tier);
  const retentionDays = policy?.retentionDays ?? 30;

  const expiration = new Date(backupDate);
  expiration.setDate(expiration.getDate() + retentionDays);
  return expiration;
}
