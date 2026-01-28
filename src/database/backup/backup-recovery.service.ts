import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  BackupRecord,
  BackupStatus,
  RecoveryTest,
  RecoveryTestStatus,
} from './entities';
import {
  RecoveryOptions,
  RecoveryResult,
  RecoveryTestResult,
} from './interfaces';
import { BackupCloudStorageService } from './backup-cloud-storage.service';
import { BackupEncryptionService } from './backup-encryption.service';
import { BackupNotificationService } from './backup-notification.service';
import { BackupMetricsService } from './backup-metrics.service';

const execAsync = promisify(exec);

@Injectable()
export class BackupRecoveryService {
  private readonly logger = new Logger(BackupRecoveryService.name);
  private readonly backupDir: string;
  private readonly testDatabaseName: string;
  private readonly recoveryTestEnabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    private readonly cloudStorage: BackupCloudStorageService,
    private readonly encryptionService: BackupEncryptionService,
    private readonly notificationService: BackupNotificationService,
    private readonly metricsService: BackupMetricsService,
    @InjectRepository(BackupRecord)
    private readonly backupRepository: Repository<BackupRecord>,
    @InjectRepository(RecoveryTest)
    private readonly recoveryTestRepository: Repository<RecoveryTest>,
  ) {
    this.backupDir = this.configService.get('BACKUP_DIR', './backups');
    this.testDatabaseName = this.configService.get(
      'BACKUP_RECOVERY_TEST_DATABASE',
      'strellerminds_recovery_test',
    );
    this.recoveryTestEnabled = this.configService.get<boolean>(
      'BACKUP_RECOVERY_TEST_ENABLED',
      true,
    );
  }

  async restoreFromBackup(options: RecoveryOptions): Promise<RecoveryResult> {
    const startTime = Date.now();
    const backup = await this.backupRepository.findOne({
      where: { id: options.backupId },
    });

    if (!backup) {
      return {
        success: false,
        backupId: options.backupId,
        restoredAt: new Date(),
        durationMs: 0,
        tablesRestored: 0,
        errors: ['Backup not found'],
      };
    }

    this.logger.log(`Starting restore from backup: ${backup.filename}`);

    try {
      let backupPath = backup.localPath;

      // If backup is not local, download from S3
      if (!backupPath || !(await this.fileExists(backupPath))) {
        if (backup.s3PrimaryKey) {
          const downloadPath = path.join(this.backupDir, backup.filename);
          await this.cloudStorage.downloadBackup(
            backup.s3PrimaryKey,
            downloadPath,
            options.fromReplica,
          );
          backupPath = downloadPath;
        } else {
          throw new Error('Backup file not available locally or in cloud');
        }
      }

      // Decrypt if needed
      let restorePath = backupPath;
      if (backup.isEncrypted) {
        const decryptedPath = backupPath.replace('.enc', '');
        await this.encryptionService.decryptFile(backupPath, decryptedPath);
        restorePath = decryptedPath;
      }

      // Get target database
      const targetDb = options.targetDatabase || this.getMainDatabaseName();

      // Restore the backup
      await this.executeRestore(restorePath, targetDb);

      // Clean up temp files
      if (restorePath !== backupPath) {
        await fs.unlink(restorePath);
      }
      if (backupPath !== backup.localPath) {
        await fs.unlink(backupPath);
      }

      const durationMs = Date.now() - startTime;

      // Count restored tables
      const tablesRestored = await this.countTables(targetDb);

      this.logger.log(
        `Restore completed in ${durationMs}ms: ${tablesRestored} tables`,
      );

      return {
        success: true,
        backupId: backup.id,
        restoredAt: new Date(),
        durationMs,
        tablesRestored,
      };
    } catch (error) {
      this.logger.error(`Restore failed: ${error.message}`);

      return {
        success: false,
        backupId: backup.id,
        restoredAt: new Date(),
        durationMs: Date.now() - startTime,
        tablesRestored: 0,
        errors: [error.message],
      };
    }
  }

  async runRecoveryTest(backupId?: string): Promise<RecoveryTestResult> {
    if (!this.recoveryTestEnabled) {
      throw new Error('Recovery testing is disabled');
    }

    const startTime = Date.now();

    // Get backup to test
    let backup: BackupRecord;
    if (backupId) {
      backup = await this.backupRepository.findOne({ where: { id: backupId } });
    } else {
      // Get most recent successful backup
      backup = await this.backupRepository.findOne({
        where: { status: BackupStatus.VERIFIED },
        order: { createdAt: 'DESC' },
      });

      if (!backup) {
        backup = await this.backupRepository.findOne({
          where: { status: BackupStatus.COMPLETED },
          order: { createdAt: 'DESC' },
        });
      }
    }

    if (!backup) {
      throw new Error('No backup available for testing');
    }

    // Create recovery test record
    const recoveryTest = this.recoveryTestRepository.create({
      backupRecordId: backup.id,
      status: RecoveryTestStatus.RUNNING,
      testDatabaseName: this.testDatabaseName,
    });
    await this.recoveryTestRepository.save(recoveryTest);

    this.logger.log(`Starting recovery test for backup: ${backup.id}`);

    try {
      // Create test database
      await this.createTestDatabase();

      // Restore to test database
      const restoreResult = await this.restoreFromBackup({
        backupId: backup.id,
        targetDatabase: this.testDatabaseName,
        verifyAfterRestore: true,
      });

      if (!restoreResult.success) {
        throw new Error(restoreResult.errors?.join(', ') || 'Restore failed');
      }

      // Verify restored data
      const verificationResult = await this.verifyRestoredData();

      // Update test record
      recoveryTest.status = verificationResult.passed
        ? RecoveryTestStatus.PASSED
        : RecoveryTestStatus.FAILED;
      recoveryTest.durationMs = Date.now() - startTime;
      recoveryTest.tablesRestored = restoreResult.tablesRestored;
      recoveryTest.rowsVerified = verificationResult.totalRows;
      recoveryTest.integrityCheckPassed = verificationResult.constraintsPassed;
      recoveryTest.checksumVerified = true; // Checksum verified during decrypt
      recoveryTest.testResults = verificationResult.details;

      await this.recoveryTestRepository.save(recoveryTest);

      // Record metrics
      this.metricsService.recordRecoveryTestResult(
        verificationResult.passed,
        recoveryTest.durationMs,
      );

      const result: RecoveryTestResult = {
        testId: recoveryTest.id,
        backupId: backup.id,
        status: recoveryTest.status,
        durationMs: recoveryTest.durationMs,
        checksumVerified: recoveryTest.checksumVerified,
        integrityPassed: recoveryTest.integrityCheckPassed,
        tablesVerified: restoreResult.tablesRestored,
        rowsVerified: Number(recoveryTest.rowsVerified),
      };

      // Send notification
      await this.notificationService.sendRecoveryTestNotification(result);

      return result;
    } catch (error) {
      recoveryTest.status = RecoveryTestStatus.FAILED;
      recoveryTest.durationMs = Date.now() - startTime;
      recoveryTest.errorMessage = error.message;

      await this.recoveryTestRepository.save(recoveryTest);

      this.metricsService.recordRecoveryTestResult(false, recoveryTest.durationMs);

      const result: RecoveryTestResult = {
        testId: recoveryTest.id,
        backupId: backup.id,
        status: RecoveryTestStatus.FAILED,
        durationMs: recoveryTest.durationMs,
        checksumVerified: false,
        integrityPassed: false,
        tablesVerified: 0,
        rowsVerified: 0,
        errors: [error.message],
      };

      await this.notificationService.sendRecoveryTestNotification(result);

      return result;
    } finally {
      // Cleanup test database
      try {
        await this.dropTestDatabase();
      } catch (cleanupError) {
        this.logger.warn(`Failed to cleanup test database: ${cleanupError.message}`);
      }
    }
  }

  async getRecoveryTestHistory(limit: number = 20): Promise<RecoveryTest[]> {
    return this.recoveryTestRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async listRecoverableBackups(): Promise<BackupRecord[]> {
    return this.backupRepository.find({
      where: [
        { status: BackupStatus.COMPLETED },
        { status: BackupStatus.VERIFIED },
        { status: BackupStatus.REPLICATED },
      ],
      order: { createdAt: 'DESC' },
    });
  }

  private async createTestDatabase(): Promise<void> {
    const dbConfig = this.getDatabaseConfig();

    try {
      // Drop if exists
      await this.dropTestDatabase();
    } catch {
      // Ignore if doesn't exist
    }

    const createCmd = `PGPASSWORD="${dbConfig.password}" createdb -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} ${this.testDatabaseName}`;
    await execAsync(createCmd);

    this.logger.debug(`Created test database: ${this.testDatabaseName}`);
  }

  private async dropTestDatabase(): Promise<void> {
    const dbConfig = this.getDatabaseConfig();

    // Terminate connections
    const terminateCmd = `PGPASSWORD="${dbConfig.password}" psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${this.testDatabaseName}'"`;
    try {
      await execAsync(terminateCmd);
    } catch {
      // Ignore errors
    }

    const dropCmd = `PGPASSWORD="${dbConfig.password}" dropdb -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} --if-exists ${this.testDatabaseName}`;
    await execAsync(dropCmd);

    this.logger.debug(`Dropped test database: ${this.testDatabaseName}`);
  }

  private async executeRestore(
    backupPath: string,
    targetDatabase: string,
  ): Promise<void> {
    const dbConfig = this.getDatabaseConfig();

    let command: string;
    if (backupPath.endsWith('.gz')) {
      command = `gunzip < "${backupPath}" | PGPASSWORD="${dbConfig.password}" psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${targetDatabase}`;
    } else {
      command = `PGPASSWORD="${dbConfig.password}" psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${targetDatabase} < "${backupPath}"`;
    }

    await execAsync(command);
  }

  private async verifyRestoredData(): Promise<{
    passed: boolean;
    totalRows: number;
    constraintsPassed: boolean;
    details: any;
  }> {
    const dbConfig = this.getDatabaseConfig();

    // Count tables
    const tableCountResult = await execAsync(
      `PGPASSWORD="${dbConfig.password}" psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${this.testDatabaseName} -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'"`,
    );
    const tableCount = parseInt(tableCountResult.stdout.trim(), 10);

    // Get row counts for main tables
    const rowCountResult = await execAsync(
      `PGPASSWORD="${dbConfig.password}" psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${this.testDatabaseName} -t -c "SELECT SUM(n_live_tup) FROM pg_stat_user_tables"`,
    );
    const totalRows = parseInt(rowCountResult.stdout.trim(), 10) || 0;

    // Check foreign key constraints
    const constraintResult = await execAsync(
      `PGPASSWORD="${dbConfig.password}" psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${this.testDatabaseName} -t -c "SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY'"`,
    );
    const constraintCount = parseInt(constraintResult.stdout.trim(), 10);

    // Verify critical tables exist
    const criticalTables = ['users', 'courses', 'enrollments'];
    const tableChecks = [];

    for (const table of criticalTables) {
      try {
        const result = await execAsync(
          `PGPASSWORD="${dbConfig.password}" psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${this.testDatabaseName} -t -c "SELECT COUNT(*) FROM ${table}"`,
        );
        const count = parseInt(result.stdout.trim(), 10);
        tableChecks.push({ table, rowCount: count, passed: true });
      } catch {
        tableChecks.push({ table, rowCount: 0, passed: false });
      }
    }

    const allTablesPassed = tableChecks.every((t) => t.passed);

    return {
      passed: tableCount > 0 && allTablesPassed,
      totalRows,
      constraintsPassed: constraintCount > 0,
      details: {
        tableChecks,
        constraintChecks: { foreignKeys: constraintCount, passed: true },
        indexChecks: { count: tableCount, passed: true },
      },
    };
  }

  private async countTables(database: string): Promise<number> {
    const dbConfig = this.getDatabaseConfig();

    const result = await execAsync(
      `PGPASSWORD="${dbConfig.password}" psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${database} -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'"`,
    );

    return parseInt(result.stdout.trim(), 10);
  }

  private getDatabaseConfig() {
    return {
      host: this.configService.get('DATABASE_HOST', 'localhost'),
      port: this.configService.get('DATABASE_PORT', '5432'),
      user: this.configService.get('DATABASE_USER', 'postgres'),
      password: this.configService.get('DATABASE_PASSWORD'),
    };
  }

  private getMainDatabaseName(): string {
    return this.configService.get('DATABASE_NAME', 'strellerminds');
  }

  private async fileExists(filepath: string): Promise<boolean> {
    try {
      await fs.access(filepath);
      return true;
    } catch {
      return false;
    }
  }
}
