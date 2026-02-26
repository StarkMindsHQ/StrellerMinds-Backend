import { Cron } from "@nestjs/schedule";

import { Injectable } from "@nestjs/common";

@Injectable()
export class BackupScheduler {
  constructor(private readonly databaseService: any) {}

  @Cron('0 0 * * *') // midnight
  async triggerBackup() {
    await this.databaseService.triggerDatabaseBackup();
  }
}