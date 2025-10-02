import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../entities/audit.log.entity';

/**
 * AuditLogService provides logic for creating and retrieving audit logs.
 */
@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  /**
   * Create a new audit log entry.
   * @param logData Log data to record
   */
  async createLog(logData: {
    action: string;
    entityType: string;
    entityId: string;
    performedBy: string;
    details?: any;
  }): Promise<AuditLog> {
    try {
      const auditLog = new AuditLog();
      auditLog.action = logData.action;
      auditLog.entityType = logData.entityType;
      auditLog.entityId = logData.entityId;
      auditLog.performedBy = logData.performedBy;
      auditLog.details = logData.details || {};
      auditLog.timestamp = new Date();

      const savedLog = await this.auditLogRepository.save(auditLog);
      this.logger.log(
        `Audit log created: ${logData.action} on ${logData.entityType}:${logData.entityId}`,
      );

      return savedLog;
    } catch (error) {
      this.logger.error(`Failed to create audit log`, error.stack);
      // We don't want to fail the main operation if logging fails
      // Just log the error and return null
      return null;
    }
  }

  /**
   * Get audit logs for a specific entity.
   * @param entityType Type of entity
   * @param entityId Entity ID
   */
  async getLogsForEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: {
        entityType,
        entityId,
      },
      order: {
        timestamp: 'DESC',
      },
    });
  }

  /**
   * Get all user deletion logs.
   */
  async getUserDeletionLogs(): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: [
        { action: 'ACCOUNT_DEACTIVATION' },
        { action: 'ACCOUNT_DELETION_REQUESTED' },
        { action: 'ACCOUNT_DELETED' },
        { action: 'ACCOUNT_PURGED' },
      ],
      order: {
        timestamp: 'DESC',
      },
    });
  }
}
