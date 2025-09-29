import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ArchiveService } from './archive.service';

@Injectable()
export class ArchiveCronService {
  private readonly logger = new Logger(ArchiveCronService.name);

  constructor(private readonly archivingService: ArchiveService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleArchiving(): Promise<void> {
    this.logger.log('Starting data archiving job...');

    try {
      await this.archivingService.archiveOldUsers();
      await this.archivingService.archiveOldUserProfiles();
      // await this.archivingService.archiveOldPayments();
      // await this.archivingService.archiveOldNotifications();
      this.logger.log(' Data archiving completed successfully.');
    } catch (err) {
      this.logger.error(' Archiving failed:', err);
    }
  }
}
