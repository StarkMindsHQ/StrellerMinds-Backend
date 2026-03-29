import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan } from 'typeorm';
import { AuditLog, AuditSeverity } from '../models/AuditLog';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface DataRetentionPolicy {
  severity: AuditSeverity;
  retentionDays: number;
  archiveBeforeDelete: boolean;
}

export interface GDPRRequest {
  type: 'DATA_ACCESS' | 'DATA_DELETION' | 'DATA_CORRECTION' | 'DATA_PORTABILITY';
  userId: string;
  requestId: string;
  startDate?: Date;
  endDate?: Date;
  resourceTypes?: string[];
}

@Injectable()
export class ComplianceManager {
  private readonly logger = new Logger(ComplianceManager.name);
  
  private readonly defaultRetentionPolicies: DataRetentionPolicy[] = [
    { severity: AuditSeverity.LOW, retentionDays: 365, archiveBeforeDelete: false },
    { severity: AuditSeverity.MEDIUM, retentionDays: 1095, archiveBeforeDelete: true }, // 3 years
    { severity: AuditSeverity.HIGH, retentionDays: 2555, archiveBeforeDelete: true }, // 7 years
    { severity: AuditSeverity.CRITICAL, retentionDays: 3650, archiveBeforeDelete: true }, // 10 years
  ];

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    private readonly dataSource: DataSource,
  ) {}

  async applyRetentionPolicy(policy: DataRetentionPolicy): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

    const queryBuilder = this.auditLogRepository
      .createQueryBuilder('auditLog')
      .where('auditLog.severity = :severity', { severity: policy.severity })
      .andWhere('auditLog.createdAt < :cutoffDate', { cutoffDate })
      .andWhere('auditLog.isArchived = :isArchived', { isArchived: false });

    if (policy.archiveBeforeDelete) {
      // Archive first, then mark for deletion
      const archiveResult = await queryBuilder
        .update()
        .set({ 
          isArchived: true, 
          archivedAt: new Date(),
          retentionUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days for review
        })
        .execute();

      this.logger.log(`Archived ${archiveResult.affected} audit logs for ${policy.severity} severity`);
      return archiveResult.affected;
    } else {
      // Direct deletion
      const deleteResult = await queryBuilder.delete().execute();
      
      this.logger.log(`Deleted ${deleteResult.affected} audit logs for ${policy.severity} severity`);
      return deleteResult.affected;
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async applyAllRetentionPolicies(): Promise<void> {
    this.logger.log('Starting daily retention policy application');
    
    try {
      let totalProcessed = 0;
      
      for (const policy of this.defaultRetentionPolicies) {
        const processed = await this.applyRetentionPolicy(policy);
        totalProcessed += processed;
      }

      // Clean up archived logs past their retention date
      const archivedCleanupCount = await this.cleanupArchivedLogs();
      totalProcessed += archivedCleanupCount;

      this.logger.log(`Retention policy completed. Total logs processed: ${totalProcessed}`);
    } catch (error) {
      this.logger.error(`Failed to apply retention policies: ${error.message}`, error.stack);
    }
  }

  async cleanupArchivedLogs(): Promise<number> {
    const queryBuilder = this.auditLogRepository
      .createQueryBuilder('auditLog')
      .where('auditLog.isArchived = :isArchived', { isArchived: true })
      .andWhere('auditLog.retentionUntil IS NOT NULL')
      .andWhere('auditLog.retentionUntil < :now', { now: new Date() });

    const result = await queryBuilder.delete().execute();
    
    this.logger.log(`Cleaned up ${result.affected} archived logs past retention date`);
    return result.affected;
  }

  async handleGDPRRequest(request: GDPRRequest): Promise<any> {
    this.logger.log(`Processing GDPR request: ${request.type} for user: ${request.userId}`);

    switch (request.type) {
      case 'DATA_ACCESS':
        return this.handleDataAccessRequest(request);
      case 'DATA_DELETION':
        return this.handleDataDeletionRequest(request);
      case 'DATA_CORRECTION':
        return this.handleDataCorrectionRequest(request);
      case 'DATA_PORTABILITY':
        return this.handleDataPortabilityRequest(request);
      default:
        throw new Error(`Unsupported GDPR request type: ${request.type}`);
    }
  }

  private async handleDataAccessRequest(request: GDPRRequest): Promise<any> {
    const queryBuilder = this.auditLogRepository
      .createQueryBuilder('auditLog')
      .leftJoinAndSelect('auditLog.user', 'user')
      .where('auditLog.userId = :userId', { userId: request.userId });

    if (request.startDate) {
      queryBuilder.andWhere('auditLog.createdAt >= :startDate', { startDate: request.startDate });
    }

    if (request.endDate) {
      queryBuilder.andWhere('auditLog.createdAt <= :endDate', { endDate: request.endDate });
    }

    if (request.resourceTypes?.length) {
      queryBuilder.andWhere('auditLog.resourceType IN (:...resourceTypes)', { 
        resourceTypes: request.resourceTypes 
      });
    }

    const auditLogs = await queryBuilder
      .orderBy('auditLog.createdAt', 'DESC')
      .getMany();

    // Sanitize data for GDPR compliance
    const sanitizedLogs = auditLogs.map(log => ({
      id: log.id,
      action: log.action,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      severity: log.severity,
      createdAt: log.createdAt,
      description: log.description,
      category: log.category,
      // Exclude sensitive metadata unless required
      metadata: log.isComplianceRelevant ? log.metadata : undefined,
      ipAddress: log.isComplianceRelevant ? log.ipAddress : undefined,
    }));

    return {
      requestId: request.requestId,
      userId: request.userId,
      dataAccessed: sanitizedLogs.length,
      logs: sanitizedLogs,
      exportedAt: new Date(),
    };
  }

  private async handleDataDeletionRequest(request: GDPRRequest): Promise<any> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Find logs to be deleted
      const logsToDelete = await this.auditLogRepository.find({
        where: {
          userId: request.userId,
          ...(request.startDate && { createdAt: { $gte: request.startDate } }),
          ...(request.endDate && { createdAt: { $lte: request.endDate } }),
        },
      });

      // Create compliance record before deletion
      const complianceLog = this.auditLogRepository.create({
        action: 'DELETE' as any,
        resourceType: 'AUDIT_LOG' as any,
        severity: AuditSeverity.HIGH,
        isComplianceRelevant: true,
        category: 'GDPR_DELETION',
        description: `GDPR data deletion request: ${request.requestId}`,
        metadata: {
          gdprRequestId: request.requestId,
          deletedLogsCount: logsToDelete.length,
          deletedLogIds: logsToDelete.map(log => log.id),
        },
      });

      await queryRunner.manager.save(complianceLog);

      // Delete the logs
      if (logsToDelete.length > 0) {
        await queryRunner.manager.remove(logsToDelete);
      }

      await queryRunner.commitTransaction();

      this.logger.log(`GDPR deletion completed: ${logsToDelete.length} logs deleted for user ${request.userId}`);

      return {
        requestId: request.requestId,
        userId: request.userId,
        deletedLogsCount: logsToDelete.length,
        deletedAt: new Date(),
        complianceLogId: complianceLog.id,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async handleDataCorrectionRequest(request: GDPRRequest): Promise<any> {
    // For audit logs, corrections are typically handled by creating new logs
    // rather than modifying existing ones to maintain integrity
    const correctionLog = this.auditLogRepository.create({
      userId: request.userId,
      action: 'UPDATE' as any,
      resourceType: 'AUDIT_LOG' as any,
      severity: AuditSeverity.MEDIUM,
      isComplianceRelevant: true,
      category: 'GDPR_CORRECTION',
      description: `GDPR data correction request: ${request.requestId}`,
      metadata: {
        gdprRequestId: request.requestId,
        correctionRequested: true,
      },
    });

    const savedLog = await this.auditLogRepository.save(correctionLog);

    return {
      requestId: request.requestId,
      userId: request.userId,
      correctionLogId: savedLog.id,
      correctedAt: new Date(),
      message: 'Audit log correction request recorded. Original logs remain unchanged for integrity.',
    };
  }

  private async handleDataPortabilityRequest(request: GDPRRequest): Promise<any> {
    // Similar to data access but formatted for portability
    const data = await this.handleDataAccessRequest(request);
    
    return {
      ...data,
      format: 'JSON',
      portableData: true,
      schemaVersion: '1.0',
    };
  }

  async generateComplianceReport(startDate: Date, endDate: Date): Promise<any> {
    const queryBuilder = this.auditLogRepository
      .createQueryBuilder('auditLog')
      .select([
        'auditLog.severity',
        'auditLog.category',
        'auditLog.resourceType',
        'COUNT(*) as count',
      ])
      .where('auditLog.createdAt >= :startDate', { startDate })
      .andWhere('auditLog.createdAt <= :endDate', { endDate })
      .groupBy('auditLog.severity, auditLog.category, auditLog.resourceType')
      .orderBy('count', 'DESC');

    const complianceData = await queryBuilder.getRawMany();

    const totalLogs = await this.auditLogRepository
      .createQueryBuilder('auditLog')
      .where('auditLog.createdAt >= :startDate', { startDate })
      .andWhere('auditLog.createdAt <= :endDate', { endDate })
      .getCount();

    const highSeverityLogs = await this.auditLogRepository
      .createQueryBuilder('auditLog')
      .where('auditLog.createdAt >= :startDate', { startDate })
      .andWhere('auditLog.createdAt <= :endDate', { endDate })
      .andWhere('auditLog.severity IN (:...severities)', { 
        severities: [AuditSeverity.HIGH, AuditSeverity.CRITICAL] 
      })
      .getCount();

    return {
      reportPeriod: { startDate, endDate },
      totalLogs,
      highSeverityLogs,
      complianceData,
      generatedAt: new Date(),
    };
  }

  async getRetentionStatistics(): Promise<any> {
    const stats = await this.auditLogRepository
      .createQueryBuilder('auditLog')
      .select([
        'auditLog.severity',
        'auditLog.isArchived',
        'COUNT(*) as count',
        'MIN(auditLog.createdAt) as oldestDate',
        'MAX(auditLog.createdAt) as newestDate',
      ])
      .groupBy('auditLog.severity, auditLog.isArchived')
      .getRawMany();

    return {
      retentionStats: stats,
      policies: this.defaultRetentionPolicies,
      generatedAt: new Date(),
    };
  }
}
