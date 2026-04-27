import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  async createBackup(): Promise<void> {
    this.logger.log('Backup service placeholder');
  }
}
