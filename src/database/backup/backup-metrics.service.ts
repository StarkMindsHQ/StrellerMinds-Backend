import { Injectable, OnModuleInit } from '@nestjs/common';
import { Counter, Gauge, Histogram, Registry } from 'prom-client';

@Injectable()
export class BackupMetricsService implements OnModuleInit {
  private readonly registry: Registry;

  private backupTotal: Counter<string>;
  private backupFailures: Counter<string>;
  private backupDuration: Histogram<string>;
  private backupSize: Gauge<string>;
  private lastBackupTimestamp: Gauge<string>;
  private backupStorageUsed: Gauge<string>;
  private recoveryTestStatus: Gauge<string>;
  private recoveryTestDuration: Histogram<string>;
  private activeBackups: Gauge<string>;
  private pendingBackups: Gauge<string>;
  private backupVerifications: Counter<string>;
  private replicationStatus: Gauge<string>;

  constructor() {
    this.registry = new Registry();
  }

  onModuleInit() {
    this.initializeMetrics();
  }

  private initializeMetrics() {
    this.backupTotal = new Counter({
      name: 'backup_operations_total',
      help: 'Total number of backup operations',
      labelNames: ['type', 'status'],
      registers: [this.registry],
    });

    this.backupFailures = new Counter({
      name: 'backup_failures_total',
      help: 'Total number of failed backup operations',
      labelNames: ['type', 'reason'],
      registers: [this.registry],
    });

    this.backupDuration = new Histogram({
      name: 'backup_duration_seconds',
      help: 'Duration of backup operations in seconds',
      labelNames: ['type'],
      buckets: [60, 300, 600, 1800, 3600, 7200, 14400],
      registers: [this.registry],
    });

    this.backupSize = new Gauge({
      name: 'backup_size_bytes',
      help: 'Size of the last backup in bytes',
      labelNames: ['type', 'compressed'],
      registers: [this.registry],
    });

    this.lastBackupTimestamp = new Gauge({
      name: 'backup_last_success_timestamp',
      help: 'Timestamp of the last successful backup',
      labelNames: ['type'],
      registers: [this.registry],
    });

    this.backupStorageUsed = new Gauge({
      name: 'backup_storage_used_bytes',
      help: 'Total storage used by backups',
      labelNames: ['location'],
      registers: [this.registry],
    });

    this.recoveryTestStatus = new Gauge({
      name: 'backup_recovery_test_status',
      help: 'Status of the last recovery test (1=passed, 0=failed)',
      registers: [this.registry],
    });

    this.recoveryTestDuration = new Histogram({
      name: 'backup_recovery_test_duration_seconds',
      help: 'Duration of recovery tests in seconds',
      buckets: [60, 300, 600, 1800, 3600, 7200],
      registers: [this.registry],
    });

    this.activeBackups = new Gauge({
      name: 'backup_active_operations',
      help: 'Number of currently running backup operations',
      registers: [this.registry],
    });

    this.pendingBackups = new Gauge({
      name: 'backup_pending_operations',
      help: 'Number of pending backup operations',
      registers: [this.registry],
    });

    this.backupVerifications = new Counter({
      name: 'backup_verifications_total',
      help: 'Total number of backup verifications',
      labelNames: ['status'],
      registers: [this.registry],
    });

    this.replicationStatus = new Gauge({
      name: 'backup_replication_status',
      help: 'Status of last replication (1=success, 0=failed)',
      labelNames: ['region'],
      registers: [this.registry],
    });
  }

  recordBackupStart(type: string): void {
    this.activeBackups.inc();
  }

  recordBackupComplete(
    type: string,
    durationMs: number,
    sizeBytes: number,
    compressed: boolean,
  ): void {
    this.activeBackups.dec();
    this.backupTotal.inc({ type, status: 'success' });
    this.backupDuration.observe({ type }, durationMs / 1000);
    this.backupSize.set({ type, compressed: String(compressed) }, sizeBytes);
    this.lastBackupTimestamp.set({ type }, Date.now() / 1000);
  }

  recordBackupFailure(type: string, reason: string): void {
    this.activeBackups.dec();
    this.backupTotal.inc({ type, status: 'failure' });
    this.backupFailures.inc({ type, reason });
  }

  recordRecoveryTestResult(passed: boolean, durationMs: number): void {
    this.recoveryTestStatus.set(passed ? 1 : 0);
    this.recoveryTestDuration.observe(durationMs / 1000);
  }

  recordVerification(passed: boolean): void {
    this.backupVerifications.inc({ status: passed ? 'success' : 'failure' });
  }

  recordReplicationStatus(region: string, success: boolean): void {
    this.replicationStatus.set({ region }, success ? 1 : 0);
  }

  updateStorageMetrics(localBytes: number, s3PrimaryBytes: number, s3ReplicaBytes: number): void {
    this.backupStorageUsed.set({ location: 'local' }, localBytes);
    this.backupStorageUsed.set({ location: 's3_primary' }, s3PrimaryBytes);
    this.backupStorageUsed.set({ location: 's3_replica' }, s3ReplicaBytes);
  }

  setPendingBackups(count: number): void {
    this.pendingBackups.set(count);
  }

  setActiveBackups(count: number): void {
    this.activeBackups.set(count);
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  async getMetricsAsJson(): Promise<object> {
    return this.registry.getMetricsAsJSON();
  }
}
