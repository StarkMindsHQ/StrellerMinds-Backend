/* eslint-disable prettier/prettier */
/**
 * BackupModule provides backup and recovery features.
 *
 * @module Backup
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { BackupService } from './backup.service';
import { BackupController } from './backup.controller';
import { BackupVerificationService } from './backup-verification.service';
import { BackupRetentionService } from './backup-retention.service';

@Module({
  imports: [ConfigModule, ScheduleModule],
  providers: [BackupService, BackupVerificationService, BackupRetentionService],
  controllers: [BackupController],
  exports: [BackupService],
})
export class BackupModule {}
