import { Injectable, Logger } from "@nestjs/common"
import type { Repository, SelectQueryBuilder } from "typeorm"
import type { AuditLog } from "../entities/audit-log.entity"
import type { CreateAuditLogDto } from "../dto/create-audit-log.dto"
import type { AuditLogFilterDto } from "../dto/audit-log-filter.dto"
import type { PaginatedAuditLogResponseDto } from "../dto/audit-log-response.dto"
import * as crypto from "crypto"

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name)

  constructor(private auditLogRepository: Repository<AuditLog>) {}

  async createLog(createAuditLogDto: CreateAuditLogDto): Promise<AuditLog> {
    try {
      const auditLog = this.auditLogRepository.create(createAuditLogDto)

      // Generate checksum for integrity
      auditLog.checksum = this.generateChecksum(auditLog)

      const savedLog = await this.auditLogRepository.save(auditLog)
      this.logger.log(`Audit log created: ${savedLog.id}`)

      return savedLog
    } catch (error) {
      this.logger.error(`Failed to create audit log: ${error.message}`, error.stack)
      throw error
    }
  }

  async findAll(filterDto: AuditLogFilterDto): Promise<PaginatedAuditLogResponseDto> {
    const queryBuilder = this.auditLogRepository.createQueryBuilder("audit")

    this.applyFilters(queryBuilder, filterDto)
    this.applySorting(queryBuilder, filterDto)

    const total = await queryBuilder.getCount()

    const { page = 1, limit = 20 } = filterDto
    const skip = (page - 1) * limit

    const data = await queryBuilder.skip(skip).take(limit).getMany()

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  async findById(id: string): Promise<AuditLog> {
    return this.auditLogRepository.findOne({ where: { id } })
  }

  async verifyIntegrity(id: string): Promise<boolean> {
    const auditLog = await this.findById(id)
    if (!auditLog) {
      return false
    }

    const expectedChecksum = this.generateChecksum(auditLog)
    return auditLog.checksum === expectedChecksum
  }

  async getStatistics(startDate?: Date, endDate?: Date) {
    const queryBuilder = this.auditLogRepository.createQueryBuilder("audit")

    if (startDate) {
      queryBuilder.andWhere("audit.createdAt >= :startDate", { startDate })
    }

    if (endDate) {
      queryBuilder.andWhere("audit.createdAt <= :endDate", { endDate })
    }

    const [totalLogs, successfulLogs, failedLogs, actionTypeStats, severityStats] = await Promise.all([
      queryBuilder.getCount(),
      queryBuilder.clone().andWhere("audit.isSuccessful = :success", { success: true }).getCount(),
      queryBuilder.clone().andWhere("audit.isSuccessful = :success", { success: false }).getCount(),
      queryBuilder
        .clone()
        .select("audit.actionType", "actionType")
        .addSelect("COUNT(*)", "count")
        .groupBy("audit.actionType")
        .getRawMany(),
      queryBuilder
        .clone()
        .select("audit.severity", "severity")
        .addSelect("COUNT(*)", "count")
        .groupBy("audit.severity")
        .getRawMany(),
    ])

    return {
      totalLogs,
      successfulLogs,
      failedLogs,
      actionTypeStats,
      severityStats,
    }
  }

  private applyFilters(queryBuilder: SelectQueryBuilder<AuditLog>, filterDto: AuditLogFilterDto) {
    const {
      adminId,
      adminEmail,
      actionType,
      resourceType,
      resourceId,
      severity,
      startDate,
      endDate,
      search,
      isSuccessful,
      ipAddress,
    } = filterDto

    if (adminId) {
      queryBuilder.andWhere("audit.adminId = :adminId", { adminId })
    }

    if (adminEmail) {
      queryBuilder.andWhere("audit.adminEmail ILIKE :adminEmail", { adminEmail: `%${adminEmail}%` })
    }

    if (actionType) {
      queryBuilder.andWhere("audit.actionType = :actionType", { actionType })
    }

    if (resourceType) {
      queryBuilder.andWhere("audit.resourceType ILIKE :resourceType", { resourceType: `%${resourceType}%` })
    }

    if (resourceId) {
      queryBuilder.andWhere("audit.resourceId = :resourceId", { resourceId })
    }

    if (severity) {
      queryBuilder.andWhere("audit.severity = :severity", { severity })
    }

    if (startDate) {
      queryBuilder.andWhere("audit.createdAt >= :startDate", { startDate })
    }

    if (endDate) {
      queryBuilder.andWhere("audit.createdAt <= :endDate", { endDate })
    }

    if (search) {
      queryBuilder.andWhere(
        "(audit.description ILIKE :search OR audit.adminEmail ILIKE :search OR audit.resourceType ILIKE :search)",
        { search: `%${search}%` },
      )
    }

    if (typeof isSuccessful === "boolean") {
      queryBuilder.andWhere("audit.isSuccessful = :isSuccessful", { isSuccessful })
    }

    if (ipAddress) {
      queryBuilder.andWhere("audit.ipAddress = :ipAddress", { ipAddress })
    }
  }

  private applySorting(queryBuilder: SelectQueryBuilder<AuditLog>, filterDto: AuditLogFilterDto) {
    const { sortBy = "createdAt", sortOrder = "DESC" } = filterDto

    const allowedSortFields = ["createdAt", "actionType", "severity", "adminEmail", "resourceType", "isSuccessful"]

    if (allowedSortFields.includes(sortBy)) {
      queryBuilder.orderBy(`audit.${sortBy}`, sortOrder)
    } else {
      queryBuilder.orderBy("audit.createdAt", "DESC")
    }
  }

  private generateChecksum(auditLog: Partial<AuditLog>): string {
    const data = {
      adminId: auditLog.adminId,
      actionType: auditLog.actionType,
      resourceType: auditLog.resourceType,
      resourceId: auditLog.resourceId,
      description: auditLog.description,
      createdAt: auditLog.createdAt,
    }

    return crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex")
  }
}
