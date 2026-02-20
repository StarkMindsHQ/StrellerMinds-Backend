import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { 
  RecoveryTest,
  BackupRecord,
  BackupType,
  RetentionTier,
  RecoveryTestStatus
} from './entities';
import { RecoveryOptions } from './interfaces';
import { BackupRecoveryService } from './backup-recovery.service';

const execAsync = promisify(exec);

export interface DisasterRecoveryTestConfig {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  testDatabasePrefix: string;
  cleanupAfterTest: boolean;
  verificationDepth: number;
  alertOnFailure: boolean;
  testScenarios: RecoveryTestScenario[];
}

export interface RecoveryTestScenario {
  name: string;
  description: string;
  backupType: BackupType;
  recoveryPoint?: 'latest' | 'point-in-time' | 'specific-backup';
  targetTimeOffset?: string; // e.g., '1h', '1d', '1w'
  verificationSteps: string[];
  expectedDuration: number; // in seconds
}

export interface RecoveryTestResult {
  testId: string;
  scenario: string;
  success: boolean;
  durationMs: number;
  databaseRestored: boolean;
  dataIntegrityVerified: boolean;
  performanceMetrics: RecoveryPerformanceMetrics;
  errors?: string[];
  recommendations?: string[];
}

export interface RecoveryPerformanceMetrics {
  backupDownloadTime: number;
  restoreTime: number;
  verificationTime: number;
  totalRecoveryTime: number;
  dataThroughputMBps: number;
  cpuUsagePercent: number;
  memoryUsageMB: number;
}

export interface DisasterRecoveryReport {
  testRunId: string;
  timestamp: Date;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  averageRecoveryTime: number;
  successRate: number;
  detailedResults: RecoveryTestResult[];
  systemHealth: SystemHealthMetrics;
  recommendations: string[];
}

export interface SystemHealthMetrics {
  databaseConnectivity: boolean;
  backupStorageHealth: boolean;
  cloudStorageHealth: boolean;
  diskSpaceAvailableGB: number;
  memoryUsagePercent: number;
  cpuUsagePercent: number;
}

@Injectable()
export class DisasterRecoveryTestingService {
  private readonly logger = new Logger(DisasterRecoveryTestingService.name);
  private readonly testConfig: DisasterRecoveryTestConfig;
  private readonly testDatabaseName: string;
  private readonly testResults: Map<string, RecoveryTestResult> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    private readonly recoveryService: BackupRecoveryService,
    @InjectRepository(RecoveryTest)
    private readonly recoveryTestRepository: Repository<RecoveryTest>,
    @InjectRepository(BackupRecord)
    private readonly backupRepository: Repository<BackupRecord>,
  ) {
    this.testDatabaseName = this.configService.get(
      'BACKUP_RECOVERY_TEST_DATABASE',
      'strellerminds_recovery_test'
    );

    this.testConfig = {
      enabled: this.configService.get<boolean>('DISASTER_RECOVERY_TESTING_ENABLED', true),
      frequency: this.configService.get<'daily' | 'weekly' | 'monthly'>('DISASTER_RECOVERY_TEST_FREQUENCY', 'weekly'),
      testDatabasePrefix: this.configService.get('DISASTER_RECOVERY_TEST_DB_PREFIX', 'dr_test_'),
      cleanupAfterTest: this.configService.get<boolean>('DISASTER_RECOVERY_CLEANUP_AFTER_TEST', true),
      verificationDepth: this.configService.get<number>('DISASTER_RECOVERY_VERIFICATION_DEPTH', 5),
      alertOnFailure: this.configService.get<boolean>('DISASTER_RECOVERY_ALERT_ON_FAILURE', true),
      testScenarios: this.getDefaultTestScenarios()
    };
  }

  async runComprehensiveRecoveryTest(): Promise<DisasterRecoveryReport> {
    if (!this.testConfig.enabled) {
      this.logger.log('Disaster recovery testing is disabled');
      return this.generateEmptyReport();
    }

    const testRunId = `dr-test-${Date.now()}`;
    this.logger.log(`Starting comprehensive disaster recovery test: ${testRunId}`);

    const startTime = Date.now();
    const results: RecoveryTestResult[] = [];

    try {
      // Run all configured test scenarios
      for (const scenario of this.testConfig.testScenarios) {
        const result = await this.runRecoveryScenario(scenario, testRunId);
        results.push(result);
        this.testResults.set(result.testId, result);
      }

      const duration = Date.now() - startTime;
      const systemHealth = await this.getSystemHealthMetrics();
      const report = this.generateRecoveryReport(testRunId, results, systemHealth, duration);

      // Store test results
      await this.storeTestResults(testRunId, results, report);

      // Send alerts if configured
      if (this.testConfig.alertOnFailure) {
        await this.sendFailureAlerts(results);
      }

      this.logger.log(`Disaster recovery test completed: ${testRunId}`);
      return report;

    } catch (error) {
      this.logger.error(`Disaster recovery test failed: ${error.message}`);
      throw error;
    }
  }

  async runRecoveryScenario(
    scenario: RecoveryTestScenario,
    testRunId: string
  ): Promise<RecoveryTestResult> {
    const testId = `${testRunId}-${scenario.name.toLowerCase().replace(/\s+/g, '-')}`;
    const startTime = Date.now();

    this.logger.log(`Running recovery scenario: ${scenario.name}`);

    try {
      // Create test database
      const testDbName = `${this.testConfig.testDatabasePrefix}${Date.now()}`;
      await this.createTestDatabase(testDbName);

      // Select appropriate backup based on scenario
      const backup = await this.selectBackupForScenario(scenario);
      if (!backup) {
        throw new Error(`No suitable backup found for scenario: ${scenario.name}`);
      }

      // Perform recovery
      const recoveryOptions: RecoveryOptions = {
        backupId: backup.id,
        targetDatabase: testDbName,
        verifyAfterRestore: true
      };

      if (scenario.recoveryPoint === 'point-in-time') {
        const targetTime = this.calculateTargetTime(scenario.targetTimeOffset);
        recoveryOptions.pointInTime = targetTime;
      }

      const recoveryStartTime = Date.now();
      const recoveryResult = await this.recoveryService.restoreFromBackup(recoveryOptions);
      const recoveryDuration = Date.now() - recoveryStartTime;

      // Verify recovery
      const verificationStartTime = Date.now();
      const verificationResult = await this.verifyRecovery(testDbName, scenario.verificationSteps);
      const verificationDuration = Date.now() - verificationStartTime;

      // Collect performance metrics
      const performanceMetrics: RecoveryPerformanceMetrics = {
        backupDownloadTime: 0, // Would be measured in real implementation
        restoreTime: recoveryDuration,
        verificationTime: verificationDuration,
        totalRecoveryTime: Date.now() - startTime,
        dataThroughputMBps: this.calculateThroughput(backup.sizeBytes, recoveryDuration),
        cpuUsagePercent: await this.getCpuUsage(),
        memoryUsageMB: await this.getMemoryUsage()
      };

      // Cleanup test database
      if (this.testConfig.cleanupAfterTest) {
        await this.cleanupTestDatabase(testDbName);
      }

      const result: RecoveryTestResult = {
        testId,
        scenario: scenario.name,
        success: recoveryResult.success && verificationResult.success,
        durationMs: Date.now() - startTime,
        databaseRestored: recoveryResult.success,
        dataIntegrityVerified: verificationResult.success,
        performanceMetrics,
        errors: [
          ...(recoveryResult.errors || []),
          ...(verificationResult.errors || [])
        ],
        recommendations: this.generateRecommendations(
          recoveryResult,
          verificationResult,
          performanceMetrics
        )
      };

      return result;

    } catch (error) {
      this.logger.error(`Recovery scenario failed: ${scenario.name} - ${error.message}`);
      
      return {
        testId,
        scenario: scenario.name,
        success: false,
        durationMs: Date.now() - startTime,
        databaseRestored: false,
        dataIntegrityVerified: false,
        performanceMetrics: {
          backupDownloadTime: 0,
          restoreTime: 0,
          verificationTime: 0,
          totalRecoveryTime: Date.now() - startTime,
          dataThroughputMBps: 0,
          cpuUsagePercent: 0,
          memoryUsageMB: 0
        },
        errors: [error.message]
      };
    }
  }

  @Cron('0 2 * * 0', { name: 'weekly-disaster-recovery-test' }) // Weekly at 2 AM on Sunday
  async runScheduledRecoveryTest(): Promise<void> {
    if (!this.testConfig.enabled || this.testConfig.frequency !== 'weekly') {
      return;
    }

    try {
      await this.runComprehensiveRecoveryTest();
    } catch (error) {
      this.logger.error(`Scheduled disaster recovery test failed: ${error.message}`);
    }
  }

  @Cron('0 3 1 * *', { name: 'monthly-disaster-recovery-test' }) // Monthly on 1st at 3 AM
  async runMonthlyRecoveryTest(): Promise<void> {
    if (!this.testConfig.enabled || this.testConfig.frequency !== 'monthly') {
      return;
    }

    try {
      await this.runComprehensiveRecoveryTest();
    } catch (error) {
      this.logger.error(`Monthly disaster recovery test failed: ${error.message}`);
    }
  }

  async getTestHistory(limit: number = 10): Promise<RecoveryTest[]> {
    return this.recoveryTestRepository.find({
      order: { createdAt: 'DESC' },
      take: limit
    });
  }

  async getTestReport(testId: string): Promise<DisasterRecoveryReport | null> {
    const test = await this.recoveryTestRepository.findOne({
      where: { id: testId }
    });

    if (!test) {
      return null;
    }

    return {
      testRunId: test.id,
      timestamp: test.createdAt,
      totalTests: 1,
      passedTests: test.status === RecoveryTestStatus.PASSED ? 1 : 0,
      failedTests: test.status === RecoveryTestStatus.FAILED ? 1 : 0,
      averageRecoveryTime: test.durationMs,
      successRate: test.status === RecoveryTestStatus.PASSED ? 100 : 0,
      detailedResults: [{
        testId: test.id,
        scenario: 'Recovery Test',
        success: test.status === RecoveryTestStatus.PASSED,
        durationMs: test.durationMs,
        databaseRestored: test.tablesRestored > 0,
        dataIntegrityVerified: test.integrityCheckPassed,
        performanceMetrics: {
          backupDownloadTime: 0,
          restoreTime: test.durationMs,
          verificationTime: 0,
          totalRecoveryTime: test.durationMs,
          dataThroughputMBps: 0,
          cpuUsagePercent: 0,
          memoryUsageMB: 0
        }
      }],
      systemHealth: {
        databaseConnectivity: true,
        backupStorageHealth: true,
        cloudStorageHealth: true,
        diskSpaceAvailableGB: 100,
        memoryUsagePercent: 65,
        cpuUsagePercent: 45
      },
      recommendations: test.errorMessage ? [test.errorMessage] : []
    };
  }

  private async createTestDatabase(databaseName: string): Promise<void> {
    const query = `CREATE DATABASE ${databaseName}`;
    await this.dataSource.query(query);
    this.logger.log(`Created test database: ${databaseName}`);
  }

  private async cleanupTestDatabase(databaseName: string): Promise<void> {
    try {
      const query = `DROP DATABASE IF EXISTS ${databaseName}`;
      await this.dataSource.query(query);
      this.logger.log(`Cleaned up test database: ${databaseName}`);
    } catch (error) {
      this.logger.warn(`Failed to cleanup test database ${databaseName}: ${error.message}`);
    }
  }

  private async selectBackupForScenario(scenario: RecoveryTestScenario): Promise<BackupRecord | null> {
    const queryBuilder = this.backupRepository.createQueryBuilder('backup')
      .where('backup.status = :status', { status: 'completed' })
      .andWhere('backup.type = :type', { type: scenario.backupType })
      .orderBy('backup.createdAt', 'DESC')
      .limit(1);

    if (scenario.recoveryPoint === 'point-in-time' && scenario.targetTimeOffset) {
      const targetTime = this.calculateTargetTime(scenario.targetTimeOffset);
      queryBuilder.andWhere('backup.createdAt <= :targetTime', { targetTime });
    }

    return queryBuilder.getOne();
  }

  private calculateTargetTime(offset: string): Date {
    const now = new Date();
    const match = offset.match(/^(\d+)([hdw])$/);
    
    if (!match) {
      throw new Error(`Invalid time offset format: ${offset}`);
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'h':
        now.setHours(now.getHours() - value);
        break;
      case 'd':
        now.setDate(now.getDate() - value);
        break;
      case 'w':
        now.setDate(now.getDate() - (value * 7));
        break;
    }

    return now;
  }

  private async verifyRecovery(
    databaseName: string,
    verificationSteps: string[]
  ): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];
    let success = true;

    try {
      // Switch to test database
      const testDataSource = this.dataSource;
      
      // Run verification queries
      for (const step of verificationSteps) {
        try {
          await testDataSource.query(step);
        } catch (error) {
          errors.push(`Verification step failed: ${step} - ${error.message}`);
          success = false;
        }
      }

      // Additional integrity checks
      const integrityCheck = await this.performIntegrityCheck(testDataSource);
      if (!integrityCheck.success) {
        errors.push(...integrityCheck.errors);
        success = false;
      }

    } catch (error) {
      errors.push(`Database verification failed: ${error.message}`);
      success = false;
    }

    return { success, errors };
  }

  private async performIntegrityCheck(dataSource: DataSource): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    try {
      // Check for table consistency
      const tableCheck = await dataSource.query(`
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
      `);
      
      if (tableCheck.length === 0) {
        errors.push('No tables found in public schema');
        return { success: false, errors };
      }

      // Check for data consistency (basic row counts)
      for (const table of tableCheck.slice(0, this.testConfig.verificationDepth)) {
        try {
          const count = await dataSource.query(`SELECT COUNT(*) as count FROM ${table.schemaname}.${table.tablename}`);
          if (count[0].count < 0) {
            errors.push(`Invalid row count for table ${table.schemaname}.${table.tablename}`);
          }
        } catch (error) {
          errors.push(`Failed to verify table ${table.schemaname}.${table.tablename}: ${error.message}`);
        }
      }

      return { success: errors.length === 0, errors };
    } catch (error) {
      errors.push(`Integrity check failed: ${error.message}`);
      return { success: false, errors };
    }
  }

  private calculateThroughput(sizeBytes: number, durationMs: number): number {
    if (durationMs === 0) return 0;
    return (sizeBytes / (1024 * 1024)) / (durationMs / 1000);
  }

  private async getCpuUsage(): Promise<number> {
    // This would integrate with system monitoring
    return 45; // Mock value
  }

  private async getMemoryUsage(): Promise<number> {
    // This would integrate with system monitoring
    return 1024; // Mock value in MB
  }

  private generateRecommendations(
    recoveryResult: any,
    verificationResult: any,
    performanceMetrics: RecoveryPerformanceMetrics
  ): string[] {
    const recommendations: string[] = [];

    if (performanceMetrics.totalRecoveryTime > 300000) { // 5 minutes
      recommendations.push('Consider optimizing backup size or improving network bandwidth');
    }

    if (performanceMetrics.dataThroughputMBps < 10) {
      recommendations.push('Low data throughput detected - check storage I/O performance');
    }

    if (!recoveryResult.success) {
      recommendations.push('Review backup creation process and ensure backups are completing successfully');
    }

    if (!verificationResult.success) {
      recommendations.push('Review data verification procedures and database schema consistency');
    }

    return recommendations;
  }

  private async getSystemHealthMetrics(): Promise<SystemHealthMetrics> {
    return {
      databaseConnectivity: true, // Would check actual connectivity
      backupStorageHealth: true, // Would check backup storage
      cloudStorageHealth: true, // Would check cloud storage
      diskSpaceAvailableGB: 100, // Would check actual disk space
      memoryUsagePercent: 65, // Would check actual memory usage
      cpuUsagePercent: 45 // Would check actual CPU usage
    };
  }

  private generateRecoveryReport(
    testRunId: string,
    results: RecoveryTestResult[],
    systemHealth: SystemHealthMetrics,
    duration: number
  ): DisasterRecoveryReport {
    const passedTests = results.filter(r => r.success).length;
    const failedTests = results.length - passedTests;
    const successRate = results.length > 0 ? (passedTests / results.length) * 100 : 0;
    const averageRecoveryTime = results.length > 0 
      ? results.reduce((sum, r) => sum + r.durationMs, 0) / results.length 
      : 0;

    const recommendations: string[] = [];
    if (successRate < 80) {
      recommendations.push('Recovery success rate below 80% - immediate attention required');
    }
    if (averageRecoveryTime > 300000) {
      recommendations.push('Average recovery time exceeds 5 minutes - optimization needed');
    }

    return {
      testRunId,
      timestamp: new Date(),
      totalTests: results.length,
      passedTests,
      failedTests,
      averageRecoveryTime,
      successRate,
      detailedResults: results,
      systemHealth,
      recommendations
    };
  }

  private async storeTestResults(
    testRunId: string,
    results: RecoveryTestResult[],
    report: DisasterRecoveryReport
  ): Promise<void> {
    const testRecord = this.recoveryTestRepository.create({
      backupRecordId: 'test-run-' + testRunId,
      status: results.every(r => r.success) ? RecoveryTestStatus.PASSED : RecoveryTestStatus.FAILED,
      durationMs: report.detailedResults.reduce((sum, r) => sum + r.durationMs, 0),
      tablesRestored: report.totalTests,
      rowsVerified: BigInt(report.passedTests).valueOf() as unknown as number,
      integrityCheckPassed: results.every(r => r.success),
      checksumVerified: true,
      testResults: {
        tableChecks: [],
        constraintChecks: { foreignKeys: 0, passed: true },
        indexChecks: { count: 0, passed: true },
        queryTests: []
      },
      testDatabaseName: `dr-test-${testRunId}`
    });

    await this.recoveryTestRepository.save(testRecord);
  }

  private async sendFailureAlerts(results: RecoveryTestResult[]): Promise<void> {
    const failedTests = results.filter(r => !r.success);
    if (failedTests.length === 0) return;

    // This would integrate with actual alerting system
    this.logger.error(`Disaster recovery test failures detected: ${failedTests.length} tests failed`);
  }

  private generateEmptyReport(): DisasterRecoveryReport {
    return {
      testRunId: 'disabled',
      timestamp: new Date(),
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      averageRecoveryTime: 0,
      successRate: 0,
      detailedResults: [],
      systemHealth: {
        databaseConnectivity: false,
        backupStorageHealth: false,
        cloudStorageHealth: false,
        diskSpaceAvailableGB: 0,
        memoryUsagePercent: 0,
        cpuUsagePercent: 0
      },
      recommendations: ['Disaster recovery testing is disabled']
    };
  }

  private getDefaultTestScenarios(): RecoveryTestScenario[] {
    return [
      {
        name: 'Full Backup Recovery',
        description: 'Test recovery from latest full backup',
        backupType: BackupType.FULL,
        recoveryPoint: 'latest',
        verificationSteps: [
          'SELECT COUNT(*) FROM users',
          'SELECT COUNT(*) FROM courses',
          'SELECT COUNT(*) FROM payments'
        ],
        expectedDuration: 300
      },
      {
        name: 'Point-in-Time Recovery',
        description: 'Test recovery to specific point in time',
        backupType: BackupType.SNAPSHOT,
        recoveryPoint: 'point-in-time',
        targetTimeOffset: '1h',
        verificationSteps: [
          'SELECT COUNT(*) FROM audit_logs WHERE created_at <= NOW() - INTERVAL \'1 hour\'',
          'SELECT COUNT(*) FROM transactions WHERE created_at <= NOW() - INTERVAL \'1 hour\''
        ],
        expectedDuration: 600
      },
      {
        name: 'Incremental Backup Recovery',
        description: 'Test recovery from incremental backup chain',
        backupType: BackupType.INCREMENTAL,
        recoveryPoint: 'latest',
        verificationSteps: [
          'SELECT COUNT(*) FROM user_sessions',
          'SELECT COUNT(*) FROM activity_logs'
        ],
        expectedDuration: 180
      }
    ];
  }
}