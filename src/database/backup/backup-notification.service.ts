import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  BackupAlertPayload,
  BackupAlertSeverity,
  SlackMessage,
  SlackAttachment,
  RecoveryTestResult,
} from './interfaces';
import { BackupRecord, BackupStatus } from './entities';

@Injectable()
export class BackupNotificationService {
  private readonly logger = new Logger(BackupNotificationService.name);
  private readonly slackWebhookUrl: string;
  private readonly emailRecipients: string[];
  private readonly webhookUrl: string;
  private readonly alertOnSuccess: boolean;
  private readonly alertOnFailure: boolean;
  private readonly alertOnRecoveryTest: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.slackWebhookUrl = this.configService.get('SLACK_WEBHOOK_URL', '');
    this.emailRecipients = this.configService
      .get('EMAIL_ALERT_RECIPIENTS', '')
      .split(',')
      .filter((e) => e.trim());
    this.webhookUrl = this.configService.get('WEBHOOK_ALERT_URL', '');
    this.alertOnSuccess = this.configService.get<boolean>('BACKUP_ALERT_ON_SUCCESS', false);
    this.alertOnFailure = this.configService.get<boolean>('BACKUP_ALERT_ON_FAILURE', true);
    this.alertOnRecoveryTest = this.configService.get<boolean>(
      'BACKUP_ALERT_ON_RECOVERY_TEST',
      true,
    );
  }

  async sendBackupSuccessNotification(backup: BackupRecord): Promise<void> {
    if (!this.alertOnSuccess) {
      this.logger.debug('Success notifications disabled, skipping');
      return;
    }

    const alert: BackupAlertPayload = {
      severity: BackupAlertSeverity.INFO,
      title: 'Backup Completed Successfully',
      message:
        `Database backup completed successfully.\n` +
        `File: ${backup.filename}\n` +
        `Size: ${this.formatBytes(Number(backup.sizeBytes))}\n` +
        `Duration: ${(backup.durationMs / 1000).toFixed(1)}s\n` +
        `Encrypted: ${backup.isEncrypted ? 'Yes' : 'No'}\n` +
        `Storage: ${backup.storageLocations?.join(', ') || 'Local'}`,
      backupId: backup.id,
      timestamp: new Date(),
      metadata: {
        filename: backup.filename,
        sizeBytes: backup.sizeBytes,
        durationMs: backup.durationMs,
        type: backup.type,
        tier: backup.retentionTier,
      },
    };

    await this.sendAlert(alert);
  }

  async sendBackupFailureNotification(backup: BackupRecord, error: string): Promise<void> {
    if (!this.alertOnFailure) {
      this.logger.debug('Failure notifications disabled, skipping');
      return;
    }

    const alert: BackupAlertPayload = {
      severity: BackupAlertSeverity.CRITICAL,
      title: 'Backup Failed',
      message:
        `Database backup failed!\n` +
        `File: ${backup.filename}\n` +
        `Error: ${error}\n` +
        `Retry Count: ${backup.retryCount}`,
      backupId: backup.id,
      timestamp: new Date(),
      metadata: {
        filename: backup.filename,
        error,
        retryCount: backup.retryCount,
        type: backup.type,
      },
    };

    await this.sendAlert(alert);
  }

  async sendRecoveryTestNotification(result: RecoveryTestResult): Promise<void> {
    if (!this.alertOnRecoveryTest) {
      this.logger.debug('Recovery test notifications disabled, skipping');
      return;
    }

    const passed = result.status === 'passed';
    const alert: BackupAlertPayload = {
      severity: passed ? BackupAlertSeverity.INFO : BackupAlertSeverity.CRITICAL,
      title: passed ? 'Recovery Test Passed' : 'Recovery Test Failed',
      message:
        `Backup recovery test ${passed ? 'passed' : 'FAILED'}!\n` +
        `Backup ID: ${result.backupId}\n` +
        `Duration: ${(result.durationMs / 1000).toFixed(1)}s\n` +
        `Tables Verified: ${result.tablesVerified}\n` +
        `Rows Verified: ${result.rowsVerified}\n` +
        `Checksum: ${result.checksumVerified ? 'Verified' : 'Failed'}\n` +
        `Integrity: ${result.integrityPassed ? 'Passed' : 'Failed'}` +
        (result.errors?.length ? `\nErrors: ${result.errors.join(', ')}` : ''),
      backupId: result.backupId,
      timestamp: new Date(),
      metadata: {
        testId: result.testId,
        status: result.status,
        tablesVerified: result.tablesVerified,
        rowsVerified: result.rowsVerified,
      },
    };

    await this.sendAlert(alert);
  }

  async sendRetentionCleanupNotification(deletedCount: number, freedBytes: number): Promise<void> {
    if (deletedCount === 0) return;

    const alert: BackupAlertPayload = {
      severity: BackupAlertSeverity.INFO,
      title: 'Backup Retention Cleanup Complete',
      message:
        `Expired backups cleaned up.\n` +
        `Backups Deleted: ${deletedCount}\n` +
        `Space Freed: ${this.formatBytes(freedBytes)}`,
      timestamp: new Date(),
      metadata: {
        deletedCount,
        freedBytes,
      },
    };

    await this.sendAlert(alert);
  }

  async sendStorageWarningNotification(
    usagePercent: number,
    totalSizeBytes: number,
  ): Promise<void> {
    const alert: BackupAlertPayload = {
      severity: usagePercent > 95 ? BackupAlertSeverity.CRITICAL : BackupAlertSeverity.WARNING,
      title: 'Backup Storage Warning',
      message:
        `Backup storage usage is high!\n` +
        `Usage: ${usagePercent.toFixed(1)}%\n` +
        `Total Size: ${this.formatBytes(totalSizeBytes)}`,
      timestamp: new Date(),
      metadata: {
        usagePercent,
        totalSizeBytes,
      },
    };

    await this.sendAlert(alert);
  }

  async sendReplicationFailureNotification(backupId: string, error: string): Promise<void> {
    const alert: BackupAlertPayload = {
      severity: BackupAlertSeverity.ERROR,
      title: 'Cross-Region Replication Failed',
      message:
        `Failed to replicate backup to secondary region.\n` +
        `Backup ID: ${backupId}\n` +
        `Error: ${error}`,
      backupId,
      timestamp: new Date(),
      metadata: { error },
    };

    await this.sendAlert(alert);
  }

  async sendAlert(alert: BackupAlertPayload): Promise<void> {
    const promises: Promise<void>[] = [];

    if (this.slackWebhookUrl) {
      promises.push(this.sendSlackNotification(alert));
    }

    if (this.webhookUrl) {
      promises.push(this.sendWebhookNotification(alert));
    }

    // Email notifications can be added here by integrating with
    // the existing NotificationsService when needed

    await Promise.allSettled(promises);
  }

  private async sendSlackNotification(alert: BackupAlertPayload): Promise<void> {
    try {
      const message = this.formatSlackMessage(alert);

      await firstValueFrom(
        this.httpService.post(this.slackWebhookUrl, message, {
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      this.logger.debug('Slack notification sent successfully');
    } catch (error) {
      this.logger.error(`Failed to send Slack notification: ${error.message}`);
    }
  }

  private async sendWebhookNotification(alert: BackupAlertPayload): Promise<void> {
    try {
      const headersConfig = this.configService.get('WEBHOOK_ALERT_HEADERS', '{}');
      let headers: Record<string, string> = {};

      try {
        headers = JSON.parse(headersConfig);
      } catch {
        // Invalid JSON, use empty headers
      }

      await firstValueFrom(
        this.httpService.post(
          this.webhookUrl,
          {
            ...alert,
            source: 'strellerminds-backup',
          },
          { headers },
        ),
      );

      this.logger.debug('Webhook notification sent successfully');
    } catch (error) {
      this.logger.error(`Failed to send webhook notification: ${error.message}`);
    }
  }

  private formatSlackMessage(alert: BackupAlertPayload): SlackMessage {
    const colorMap: Record<BackupAlertSeverity, string> = {
      [BackupAlertSeverity.INFO]: '#36a64f',
      [BackupAlertSeverity.WARNING]: '#ffcc00',
      [BackupAlertSeverity.ERROR]: '#ff6600',
      [BackupAlertSeverity.CRITICAL]: '#ff0000',
    };

    const iconMap: Record<BackupAlertSeverity, string> = {
      [BackupAlertSeverity.INFO]: ':white_check_mark:',
      [BackupAlertSeverity.WARNING]: ':warning:',
      [BackupAlertSeverity.ERROR]: ':x:',
      [BackupAlertSeverity.CRITICAL]: ':rotating_light:',
    };

    const attachment: SlackAttachment = {
      color: colorMap[alert.severity],
      title: `${iconMap[alert.severity]} ${alert.title}`,
      text: alert.message,
      fields: [],
      footer: 'StrellerMinds Backup System',
      ts: Math.floor(alert.timestamp.getTime() / 1000),
    };

    if (alert.backupId) {
      attachment.fields?.push({
        title: 'Backup ID',
        value: alert.backupId,
        short: true,
      });
    }

    attachment.fields?.push({
      title: 'Severity',
      value: alert.severity.toUpperCase(),
      short: true,
    });

    return {
      username: 'Backup Bot',
      icon_emoji: ':floppy_disk:',
      attachments: [attachment],
    };
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }
}
