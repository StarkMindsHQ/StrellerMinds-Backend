import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BackupRecord, BackupStatus, RecoveryTest, RecoveryTestStatus } from './entities';
import {
  DisasterRecoveryReport,
  DisasterRecoveryTestingService,
} from './disaster-recovery-testing.service';

export interface RecoveryObjectiveStatus {
  objective: 'RTO' | 'RPO';
  targetMinutes: number;
  actualMinutes: number | null;
  status: 'meeting' | 'breached' | 'insufficient_data';
  detail: string;
}

export interface RecoveryTrainingRecord {
  member: string;
  role: string;
  lastCompletedAt: Date | null;
  trainingStatus: 'current' | 'due';
}

@Injectable()
export class DisasterRecoveryGovernanceService {
  private readonly logger = new Logger(DisasterRecoveryGovernanceService.name);
  private readonly trainingRecords: RecoveryTrainingRecord[] = [
    {
      member: 'Database Operations Lead',
      role: 'restore-coordinator',
      lastCompletedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      trainingStatus: 'current',
    },
    {
      member: 'Platform Incident Commander',
      role: 'incident-lead',
      lastCompletedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
      trainingStatus: 'due',
    },
    {
      member: 'Security And Compliance Lead',
      role: 'communications',
      lastCompletedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      trainingStatus: 'current',
    },
  ];

  constructor(
    private readonly configService: ConfigService,
    private readonly disasterRecoveryTestingService: DisasterRecoveryTestingService,
    @InjectRepository(BackupRecord)
    private readonly backupRepository: Repository<BackupRecord>,
    @InjectRepository(RecoveryTest)
    private readonly recoveryTestRepository: Repository<RecoveryTest>,
  ) {}

  @Cron('0 4 * * 0', { name: 'automated-disaster-recovery-governance-run' })
  async runAutomatedDisasterRecoveryProgram() {
    try {
      const report = await this.disasterRecoveryTestingService.runComprehensiveRecoveryTest();
      this.logger.log(`Automated disaster recovery program completed: ${report.testRunId}`);
      return report;
    } catch (error) {
      this.logger.error(`Automated disaster recovery program failed: ${error.message}`);
      throw error;
    }
  }

  async getDisasterRecoveryDashboard() {
    const objectives = await this.getRecoveryObjectives();
    const latestReport = await this.getLatestComprehensiveReport();
    const latestTests = await this.recoveryTestRepository.find({
      order: { createdAt: 'DESC' },
      take: 5,
    });

    return {
      generatedAt: new Date(),
      latestReport,
      objectives,
      recentTests: latestTests,
      training: this.getTrainingStatus(),
      documentation: {
        runbookPath: 'docs/disaster-recovery.md',
        summary:
          'The disaster recovery runbook defines automated testing cadence, RTO/RPO review, communication ownership, and training expectations.',
      },
    };
  }

  async getRecoveryObjectives(): Promise<RecoveryObjectiveStatus[]> {
    const rtoTargetMinutes = this.configService.get<number>(
      'DISASTER_RECOVERY_RTO_TARGET_MINUTES',
      60,
    );
    const rpoTargetMinutes = this.configService.get<number>(
      'DISASTER_RECOVERY_RPO_TARGET_MINUTES',
      30,
    );

    const latestPassingTest = await this.recoveryTestRepository.findOne({
      where: { status: RecoveryTestStatus.PASSED },
      order: { createdAt: 'DESC' },
    });

    const latestBackup = await this.backupRepository.findOne({
      where: [
        { status: BackupStatus.VERIFIED },
        { status: BackupStatus.COMPLETED },
        { status: BackupStatus.REPLICATED },
      ],
      order: { createdAt: 'DESC' },
    });

    const latestRtoMinutes = latestPassingTest
      ? Number((latestPassingTest.durationMs / 60000).toFixed(2))
      : null;
    const latestRpoMinutes = latestBackup
      ? Number(((Date.now() - latestBackup.createdAt.getTime()) / 60000).toFixed(2))
      : null;

    return [
      {
        objective: 'RTO',
        targetMinutes: rtoTargetMinutes,
        actualMinutes: latestRtoMinutes,
        status:
          latestRtoMinutes === null
            ? 'insufficient_data'
            : latestRtoMinutes <= rtoTargetMinutes
              ? 'meeting'
              : 'breached',
        detail:
          latestRtoMinutes === null
            ? 'No successful disaster recovery test is available yet.'
            : `Latest successful recovery test completed in ${latestRtoMinutes} minutes.`,
      },
      {
        objective: 'RPO',
        targetMinutes: rpoTargetMinutes,
        actualMinutes: latestRpoMinutes,
        status:
          latestRpoMinutes === null
            ? 'insufficient_data'
            : latestRpoMinutes <= rpoTargetMinutes
              ? 'meeting'
              : 'breached',
        detail:
          latestRpoMinutes === null
            ? 'No recent backup is available for RPO validation.'
            : `Latest recoverable backup is ${latestRpoMinutes} minutes old.`,
      },
    ];
  }

  getTrainingStatus() {
    return {
      cadence: 'monthly tabletop review with quarterly hands-on restore validation',
      members: this.trainingRecords,
      overdueMembers: this.trainingRecords.filter((record) => record.trainingStatus === 'due')
        .length,
    };
  }

  updateTrainingRecord(member: string, completedAt = new Date()) {
    const existingRecord = this.trainingRecords.find((record) => record.member === member);

    if (existingRecord) {
      existingRecord.lastCompletedAt = completedAt;
      existingRecord.trainingStatus = 'current';
      return existingRecord;
    }

    const newRecord: RecoveryTrainingRecord = {
      member,
      role: 'recovery-team-member',
      lastCompletedAt: completedAt,
      trainingStatus: 'current',
    };
    this.trainingRecords.push(newRecord);
    return newRecord;
  }

  private async getLatestComprehensiveReport(): Promise<DisasterRecoveryReport | null> {
    const latestTest = await this.recoveryTestRepository.findOne({
      order: { createdAt: 'DESC' },
    });

    if (!latestTest) {
      return null;
    }

    return this.disasterRecoveryTestingService.getTestReport(latestTest.id);
  }
}
