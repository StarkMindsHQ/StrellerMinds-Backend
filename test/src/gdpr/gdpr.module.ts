/**
 * GdprModule provides user consent, data export, and deletion request features.
 *
 * @module GDPR
 */
import { Module } from '@nestjs/common';
import { GdprService } from './gdpr.service';
import { GdprController } from './gdpr.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsentService } from './consent.service';
import { DataDeletionService } from './data-deletion.service';
import { DataExportService } from './data-export.service';
import { DataProcessingLog } from './entities/data-processing-log.entity';
import { DeletionRequest } from './entities/deletion-request.entity';
import { UserConsent } from './entities/user-consent.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserConsent, DataProcessingLog, DeletionRequest]),
  ],
  controllers: [GdprController],
  providers: [
    GdprService,
    ConsentService,
    DataExportService,
    DataDeletionService,
  ],
  exports: [GdprService, ConsentService],
})
export class GdprModule {}
