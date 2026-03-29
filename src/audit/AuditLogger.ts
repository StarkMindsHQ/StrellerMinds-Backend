import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { AuditLog, AuditAction, AuditResourceType, AuditSeverity } from '../models/AuditLog';
import { User } from '../auth/entities/user.entity';

export interface AuditLogEntry {
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId?: string;
  userId?: string;
  severity?: AuditSeverity;
  ipAddress?: string;
  userAgent?: string;
  oldValues?: any;
  newValues?: any;
  metadata?: any;
  sessionId?: string;
  correlationId?: string;
  isComplianceRelevant?: boolean;
  description?: string;
  category?: string;
  subcategory?: string;
  location?: string;
  deviceId?: string;
  gdprData?: any;
}

@Injectable()
export class AuditLogger {
  private readonly logger = new Logger(AuditLogger.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    private readonly dataSource: DataSource,
  ) {}

  async log(entry: AuditLogEntry): Promise<AuditLog> {
    try {
      const auditLog = this.auditLogRepository.create({
        ...entry,
        severity: entry.severity || AuditSeverity.LOW,
        isComplianceRelevant: entry.isComplianceRelevant || false,
      });

      const savedLog = await this.auditLogRepository.save(auditLog);
      
      this.logger.debug(`Audit log created: ${savedLog.id}`);
      
      return savedLog;
    } catch (error) {
      this.logger.error(`Failed to create audit log: ${error.message}`, error.stack);
      throw error;
    }
  }

  async logWithUser(
    user: User,
    action: AuditAction,
    resourceType: AuditResourceType,
    resourceId?: string,
    additionalData?: Partial<AuditLogEntry>,
  ): Promise<AuditLog> {
    return this.log({
      userId: user.id,
      action,
      resourceType,
      resourceId,
      ...additionalData,
    });
  }

  async logSystemEvent(
    action: AuditAction,
    resourceType: AuditResourceType,
    resourceId?: string,
    additionalData?: Partial<AuditLogEntry>,
  ): Promise<AuditLog> {
    return this.log({
      action,
      resourceType,
      resourceId,
      severity: AuditSeverity.MEDIUM,
      isComplianceRelevant: true,
      ...additionalData,
    });
  }

  async logDataAccess(
    userId: string,
    resourceType: AuditResourceType,
    resourceId: string,
    accessType: 'READ' | 'EXPORT' | 'PRINT',
    additionalData?: Partial<AuditLogEntry>,
  ): Promise<AuditLog> {
    return this.log({
      userId,
      action: accessType === 'READ' ? AuditAction.READ : 
              accessType === 'EXPORT' ? AuditAction.EXPORT : AuditAction.READ,
      resourceType,
      resourceId,
      severity: AuditSeverity.MEDIUM,
      isComplianceRelevant: true,
      category: 'DATA_ACCESS',
      ...additionalData,
    });
  }

  async logSecurityEvent(
    action: AuditAction,
    resourceType: AuditResourceType,
    resourceId?: string,
    severity: AuditSeverity = AuditSeverity.HIGH,
    additionalData?: Partial<AuditLogEntry>,
  ): Promise<AuditLog> {
    return this.log({
      action,
      resourceType,
      resourceId,
      severity,
      isComplianceRelevant: true,
      category: 'SECURITY',
      ...additionalData,
    });
  }

  async logComplianceEvent(
    userId: string,
    action: AuditAction,
    resourceType: AuditResourceType,
    resourceId?: string,
    gdprData?: any,
    additionalData?: Partial<AuditLogEntry>,
  ): Promise<AuditLog> {
    return this.log({
      userId,
      action,
      resourceType,
      resourceId,
      severity: AuditSeverity.HIGH,
      isComplianceRelevant: true,
      category: 'COMPLIANCE',
      gdprData,
      ...additionalData,
    });
  }

  async createBatchLogs(entries: AuditLogEntry[]): Promise<AuditLog[]> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const auditLogs = entries.map(entry => 
        this.auditLogRepository.create({
          ...entry,
          severity: entry.severity || AuditSeverity.LOW,
          isComplianceRelevant: entry.isComplianceRelevant || false,
        })
      );

      const savedLogs = await queryRunner.manager.save(auditLogs);
      await queryRunner.commitTransaction();

      this.logger.debug(`Batch audit logs created: ${savedLogs.length} entries`);
      
      return savedLogs;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to create batch audit logs: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findByUserId(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
      actions?: AuditAction[];
      resourceTypes?: AuditResourceType[];
    },
  ): Promise<[AuditLog[], number]> {
    const queryBuilder = this.auditLogRepository
      .createQueryBuilder('auditLog')
      .leftJoinAndSelect('auditLog.user', 'user')
      .where('auditLog.userId = :userId', { userId });

    if (options?.startDate) {
      queryBuilder.andWhere('auditLog.createdAt >= :startDate', { startDate: options.startDate });
    }

    if (options?.endDate) {
      queryBuilder.andWhere('auditLog.createdAt <= :endDate', { endDate: options.endDate });
    }

    if (options?.actions?.length) {
      queryBuilder.andWhere('auditLog.action IN (:...actions)', { actions: options.actions });
    }

    if (options?.resourceTypes?.length) {
      queryBuilder.andWhere('auditLog.resourceType IN (:...resourceTypes)', { 
        resourceTypes: options.resourceTypes 
      });
    }

    queryBuilder
      .orderBy('auditLog.createdAt', 'DESC')
      .addOrderBy('auditLog.severity', 'DESC');

    if (options?.limit) {
      queryBuilder.limit(options.limit);
    }

    if (options?.offset) {
      queryBuilder.offset(options.offset);
    }

    return queryBuilder.getManyAndCount();
  }

  async findByResource(
    resourceType: AuditResourceType,
    resourceId: string,
    options?: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<[AuditLog[], number]> {
    const queryBuilder = this.auditLogRepository
      .createQueryBuilder('auditLog')
      .leftJoinAndSelect('auditLog.user', 'user')
      .where('auditLog.resourceType = :resourceType', { resourceType })
      .andWhere('auditLog.resourceId = :resourceId', { resourceId });

    if (options?.startDate) {
      queryBuilder.andWhere('auditLog.createdAt >= :startDate', { startDate: options.startDate });
    }

    if (options?.endDate) {
      queryBuilder.andWhere('auditLog.createdAt <= :endDate', { endDate: options.endDate });
    }

    queryBuilder
      .orderBy('auditLog.createdAt', 'DESC')
      .addOrderBy('auditLog.severity', 'DESC');

    if (options?.limit) {
      queryBuilder.limit(options.limit);
    }

    if (options?.offset) {
      queryBuilder.offset(options.offset);
    }

    return queryBuilder.getManyAndCount();
  }

  async findComplianceLogs(
    options?: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
      severity?: AuditSeverity[];
      categories?: string[];
    },
  ): Promise<[AuditLog[], number]> {
    const queryBuilder = this.auditLogRepository
      .createQueryBuilder('auditLog')
      .leftJoinAndSelect('auditLog.user', 'user')
      .where('auditLog.isComplianceRelevant = :isComplianceRelevant', { 
        isComplianceRelevant: true 
      });

    if (options?.startDate) {
      queryBuilder.andWhere('auditLog.createdAt >= :startDate', { startDate: options.startDate });
    }

    if (options?.endDate) {
      queryBuilder.andWhere('auditLog.createdAt <= :endDate', { endDate: options.endDate });
    }

    if (options?.severity?.length) {
      queryBuilder.andWhere('auditLog.severity IN (:...severity)', { severity: options.severity });
    }

    if (options?.categories?.length) {
      queryBuilder.andWhere('auditLog.category IN (:...categories)', { categories: options.categories });
    }

    queryBuilder
      .orderBy('auditLog.createdAt', 'DESC')
      .addOrderBy('auditLog.severity', 'DESC');

    if (options?.limit) {
      queryBuilder.limit(options.limit);
    }

    if (options?.offset) {
      queryBuilder.offset(options.offset);
    }

    return queryBuilder.getManyAndCount();
  }
}
