import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './entities/audit.log.entity';
import { AuditLogService } from './services/audit.log.service';
import { AuditLogController } from './controllers/audit.log.controller';

/**
 * AuditLogModule provides audit logging features.
 *
 * @module AuditLog
 */

import { SharedModule } from 'src/shared/shared.module';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog]), SharedModule],
  controllers: [AuditLogController],
  providers: [AuditLogService],
  exports: [AuditLogService],
})
export class AuditLogModule {}
