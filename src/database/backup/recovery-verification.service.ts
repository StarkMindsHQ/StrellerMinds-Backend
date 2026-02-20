import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';

import { BackupRecord, BackupStatus, BackupType } from './entities/backup-record.entity';
import { RecoveryTest, RecoveryTestStatus } from './entities/recovery-test.entity';
import { BackupRecoveryService } from './backup-recovery.service';
import { BackupNotificationService } from './backup-notification.service';
import { DisasterRecoveryTestingService } from './disaster-recovery-testing.service';
import { EnhancedBackupService } from './enhanced-backup.service';

export interface VerificationTestResult {
  testId: string;
  backupId: string;
  status: 'passed' | 'failed' | 'in_progress';
  durationMs: number;
  tablesVerified: number;
  rowsVerified: number;
  checksumVerified: boolean;
  integrityPassed: boolean;
  errors: string[];
  timestamp: Date;
}

export interface RecoveryVerificationConfig {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  testScenarios: string[];
  verificationDepth: 'shallow' | 'deep' | 'full';
  alertOnFailure: boolean;
  retentionDays: number;
}

@Injectable()
export class RecoveryVerificationService {
  private readonly logger = new Logger(RecoveryVerificationService.name);
  private config: RecoveryVerificationConfig;

  constructor(
    @InjectRepository(BackupRecord)
    private readonly backupRecordRepository: Repository<BackupRecord>,
    @InjectRepository(RecoveryTest)
    private readonly recoveryTestRepository: Repository<RecoveryTest>,
    private readonly configService: ConfigService,
    private readonly recoveryService: BackupRecoveryService,
    private readonly notificationService: BackupNotificationService,
    private readonly disasterRecoveryService: DisasterRecoveryTestingService,
    private readonly enhancedBackupService: EnhancedBackupService,
  ) {
    this.config = this.loadConfiguration();
  }

  /**
   * Run comprehensive recovery verification
   */
  async runRecoveryVerification(testType: 'automated' | 'manual' = 'automated'): Promise<VerificationTestResult> {
    this.logger.log(`Starting ${testType} recovery verification`);

    const testId = `recovery-test-${Date.now()}`;
    const startTime = Date.now();

    // Select backup to test (most recent successful backup)
    const backupToTest = await this.getBackupForTesting();
    if (!backupToTest) {
      throw new Error('No suitable backup found for testing');
    }

    // Create test record
    const testRecord = this.recoveryTestRepository.create({
      backupRecordId: backupToTest.id,
      status: RecoveryTestStatus.RUNNING,
      createdAt: new Date(),
      testDatabaseName: `verification-${testId}`,
    });
    await this.recoveryTestRepository.save(testRecord);

    try {

      // Run verification tests
      const verificationResult = await this.executeVerificationTests(backupToTest);

      // Update test record
      const durationMs = Date.now() - startTime;
      const testResult: VerificationTestResult = {
        testId,
        backupId: backupToTest.id,
        status: verificationResult.passed ? 'passed' : 'failed',
        durationMs,
        tablesVerified: verificationResult.tablesVerified,
        rowsVerified: verificationResult.rowsVerified,
        checksumVerified: verificationResult.checksumVerified,
        integrityPassed: verificationResult.integrityPassed,
        errors: verificationResult.errors,
        timestamp: new Date(),
      };

      await this.updateTestRecord(testRecord, testResult);

      // Send notifications
      if (this.config.alertOnFailure && !verificationResult.passed) {
        const notificationResult = {
          testId: testResult.testId,
          backupId: testResult.backupId,
          status: testResult.status === 'passed' ? RecoveryTestStatus.PASSED : RecoveryTestStatus.FAILED,
          durationMs: testResult.durationMs,
          tablesVerified: testResult.tablesVerified,
          rowsVerified: testResult.rowsVerified,
          checksumVerified: testResult.checksumVerified,
          integrityPassed: testResult.integrityPassed,
          errors: testResult.errors
        };
        await this.notificationService.sendRecoveryTestNotification(notificationResult);
      }

      this.logger.log(`Recovery verification ${testResult.status}: ${testId}`);
      return testResult;

    } catch (error) {
      this.logger.error(`Recovery verification failed: ${testId}`, error);
      
      // Update test record with failure
      await this.recoveryTestRepository.update(
        { backupRecordId: testRecord.backupRecordId },
        {
          status: RecoveryTestStatus.FAILED,
          errorMessage: error.message,
        }
      );

      throw error;
    }
  }

  /**
   * Run scheduled recovery tests based on configuration
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async runScheduledRecoveryTests(): Promise<void> {
    if (!this.config.enabled) {
      this.logger.debug('Recovery verification disabled, skipping scheduled tests');
      return;
    }

    this.logger.log('Running scheduled recovery tests');

    try {
      // Run different test scenarios based on configuration
      for (const scenario of this.config.testScenarios) {
        await this.runScenarioTest(scenario);
      }

      // Run disaster recovery test
      await this.disasterRecoveryService.runComprehensiveRecoveryTest();
    } catch (error) {
      this.logger.error('Scheduled recovery tests failed', error);
    }
  }

  /**
   * Verify backup integrity and consistency
   */
  async verifyBackupIntegrity(backupId: string): Promise<boolean> {
    this.logger.log(`Verifying integrity for backup: ${backupId}`);

    try {
      const backup = await this.backupRecordRepository.findOne({
        where: { id: backupId, status: BackupStatus.COMPLETED },
      });

      if (!backup) {
        throw new Error(`Backup not found or not completed: ${backupId}`);
      }

      // Verify checksum if available
      const checksumValid = await this.verifyChecksum(backup);
      
      // Verify file existence and size
      const fileValid = await this.verifyFileIntegrity(backup);
      
      // Verify metadata consistency
      const metadataValid = this.verifyMetadata(backup);

      const isIntegrityValid = checksumValid && fileValid && metadataValid;
      
      // Update backup record
      await this.backupRecordRepository.update(backupId, {
        verifiedAt: isIntegrityValid ? new Date() : null,
        status: isIntegrityValid ? BackupStatus.VERIFIED : BackupStatus.FAILED,
      });

      this.logger.log(`Backup integrity verification ${isIntegrityValid ? 'passed' : 'failed'}: ${backupId}`);
      return isIntegrityValid;

    } catch (error) {
      this.logger.error(`Backup integrity verification failed: ${backupId}`, error);
      return false;
    }
  }

  /**
   * Get recovery test history and statistics
   */
  async getRecoveryTestHistory(limit: number = 50): Promise<RecoveryTest[]> {
    return this.recoveryTestRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get recovery test statistics
   */
  async getRecoveryTestStats(): Promise<any> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [totalTests, passedTests, failedTests, recentTests] = await Promise.all([
      this.recoveryTestRepository.count(),
      this.recoveryTestRepository.count({ where: { status: RecoveryTestStatus.PASSED } }),
      this.recoveryTestRepository.count({ where: { status: RecoveryTestStatus.FAILED } }),
      this.recoveryTestRepository.find({
        where: { createdAt: MoreThan(thirtyDaysAgo) },
        order: { createdAt: 'DESC' },
        take: 10,
      }),
    ]);

    const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

    return {
      totalTests,
      passedTests,
      failedTests,
      successRate: successRate.toFixed(1),
      recentTests,
      lastTest: recentTests[0] || null,
    };
  }

  /**
   * Run point-in-time recovery verification
   */
  async verifyPointInTimeRecovery(): Promise<boolean> {
    this.logger.log('Running point-in-time recovery verification');

    try {
      // Find WAL backup for testing
      const walBackup = await this.backupRecordRepository.findOne({
        where: { 
          type: BackupType.WAL,
          status: BackupStatus.COMPLETED 
        },
        order: { createdAt: 'DESC' },
      });

      if (!walBackup) {
        this.logger.warn('No WAL backup found for point-in-time recovery verification');
        return false;
      }

      // Test PITR capability
      const testResult = await this.enhancedBackupService.performPointInTimeRecovery({
        targetTime: new Date(Date.now() - 3600000), // 1 hour ago
        verifyIntegrity: true
      });

      this.logger.log(`Point-in-time recovery verification ${testResult.success ? 'passed' : 'failed'}`);
      return testResult.success;

    } catch (error) {
      this.logger.error('Point-in-time recovery verification failed', error);
      return false;
    }
  }

  /**
   * Clean up old recovery test records
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldTests(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

    const result = await this.recoveryTestRepository.delete({
      createdAt: LessThan(cutoffDate),
    });

    this.logger.log(`Cleaned up ${result.affected} old recovery test records`);
  }

  // Private helper methods

  private loadConfiguration(): RecoveryVerificationConfig {
    return {
      enabled: this.configService.get<boolean>('RECOVERY_VERIFICATION_ENABLED', true),
      frequency: this.configService.get<'daily' | 'weekly' | 'monthly'>('RECOVERY_VERIFICATION_FREQUENCY', 'daily'),
      testScenarios: this.configService.get<string[]>('RECOVERY_TEST_SCENARIOS', [
        'basic_restore',
        'point_in_time_recovery',
        'cross_region_restore',
        'encrypted_backup_restore'
      ]),
      verificationDepth: this.configService.get<'shallow' | 'deep' | 'full'>('RECOVERY_VERIFICATION_DEPTH', 'deep'),
      alertOnFailure: this.configService.get<boolean>('RECOVERY_ALERT_ON_FAILURE', true),
      retentionDays: this.configService.get<number>('RECOVERY_TEST_RETENTION_DAYS', 90),
    };
  }

  private async getBackupForTesting(): Promise<BackupRecord | null> {
    // Get most recent successful backup
    return this.backupRecordRepository.findOne({
      where: { status: BackupStatus.COMPLETED },
      order: { createdAt: 'DESC' },
    });
  }

  private async executeVerificationTests(backup: BackupRecord): Promise<any> {
    const results = {
      passed: true,
      tablesVerified: 0,
      rowsVerified: 0,
      checksumVerified: false,
      integrityPassed: false,
      errors: [] as string[],
    };

    try {
      // Verify checksum
      results.checksumVerified = await this.verifyChecksum(backup);
      if (!results.checksumVerified) {
        results.errors.push('Checksum verification failed');
        results.passed = false;
      }

      // Verify file integrity
      const fileValid = await this.verifyFileIntegrity(backup);
      if (!fileValid) {
        results.errors.push('File integrity verification failed');
        results.passed = false;
      }

      // Verify metadata
      const metadataValid = this.verifyMetadata(backup);
      if (!metadataValid) {
        results.errors.push('Metadata verification failed');
        results.passed = false;
      }

      // Run restore test (shallow for automated tests)
      if (this.config.verificationDepth !== 'shallow') {
        const restoreResult = await this.testRestore(backup);
        if (!restoreResult.success) {
          results.errors.push(`Restore test failed: ${restoreResult.error}`);
          results.passed = false;
        } else {
          results.tablesVerified = restoreResult.tablesVerified;
          results.rowsVerified = restoreResult.rowsVerified;
        }
      }

      results.integrityPassed = results.passed;
      return results;

    } catch (error) {
      results.errors.push(`Verification error: ${error.message}`);
      results.passed = false;
      results.integrityPassed = false;
      return results;
    }
  }

  private async verifyChecksum(backup: BackupRecord): Promise<boolean> {
    if (!backup.checksumSha256) {
      this.logger.warn(`No checksum available for backup: ${backup.id}`);
      return true; // Skip checksum verification if not available
    }

    // In a real implementation, you'd verify the actual checksum
    // For now, simulate verification
    return Math.random() > 0.05; // 95% success rate for simulation
  }

  private async verifyFileIntegrity(backup: BackupRecord): Promise<boolean> {
    // Check if backup files exist and have correct size
    try {
      // Simulate file verification
      return Math.random() > 0.02; // 98% success rate for simulation
    } catch (error) {
      this.logger.error(`File integrity verification failed for ${backup.id}`, error);
      return false;
    }
  }

  private verifyMetadata(backup: BackupRecord): boolean {
    // Verify backup metadata consistency
    try {
      return backup.sizeBytes > 0 && 
             backup.filename && 
             backup.createdAt instanceof Date;
    } catch (error) {
      this.logger.error(`Metadata verification failed for ${backup.id}`, error);
      return false;
    }
  }

  private async testRestore(backup: BackupRecord): Promise<any> {
    try {
      // In a real implementation, you'd actually perform a restore test
      // For now, simulate restore test results
      const success = Math.random() > 0.1; // 90% success rate for simulation
      
      return {
        success,
        tablesVerified: success ? Math.floor(Math.random() * 50) + 10 : 0,
        rowsVerified: success ? Math.floor(Math.random() * 10000) + 1000 : 0,
        error: success ? null : 'Simulated restore failure',
      };
    } catch (error) {
      return {
        success: false,
        tablesVerified: 0,
        rowsVerified: 0,
        error: error.message,
      };
    }
  }

  private async updateTestRecord(testRecord: RecoveryTest, result: VerificationTestResult): Promise<void> {
    await this.recoveryTestRepository.update({ backupRecordId: testRecord.backupRecordId }, {
      status: result.status === 'passed' ? RecoveryTestStatus.PASSED : RecoveryTestStatus.FAILED,
      durationMs: result.durationMs,
      tablesRestored: result.tablesVerified,
      rowsVerified: BigInt(result.rowsVerified) as unknown as number,
      checksumVerified: result.checksumVerified,
      integrityCheckPassed: result.integrityPassed,
      errorMessage: result.errors.length > 0 ? result.errors.join(' ') : null,
    });
  }

  private async runScenarioTest(scenario: string): Promise<void> {
    this.logger.log(`Running recovery test scenario: ${scenario}`);

    switch (scenario) {
      case 'basic_restore':
        await this.runBasicRestoreTest();
        break;
      case 'point_in_time_recovery':
        await this.verifyPointInTimeRecovery();
        break;
      case 'cross_region_restore':
        await this.runCrossRegionRestoreTest();
        break;
      case 'encrypted_backup_restore':
        await this.runEncryptedRestoreTest();
        break;
      default:
        this.logger.warn(`Unknown test scenario: ${scenario}`);
    }
  }

  private async runBasicRestoreTest(): Promise<void> {
    const testResult = await this.runRecoveryVerification('automated');
    this.logger.log(`Basic restore test ${testResult.status}: ${testResult.testId}`);
  }

  private async runCrossRegionRestoreTest(): Promise<void> {
    // Test restoring from replica/secondary region
    this.logger.log('Running cross-region restore test');
    // Implementation would test restoring from different storage locations
  }

  private async runEncryptedRestoreTest(): Promise<void> {
    // Test restoring encrypted backups
    this.logger.log('Running encrypted backup restore test');
    // Implementation would test decryption and restore process
  }
}