import { Injectable, Logger } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { type Repository, LessThan } from "typeorm"
import { Cron, CronExpression } from "@nestjs/schedule"
import { AuditLog, AuditSeverity } from "../entities/audit-log.entity"

@Injectable()
export class AuditLogRetentionService {
  private readonly logger = new Logger(AuditLogRetentionService.name)

  // Retention periods in days
  private readonly retentionPolicies = {
    [AuditSeverity.CRITICAL]: 2555, // 7 years
    [AuditSeverity.HIGH]: 1095, // 3 years
    [AuditSeverity.MEDIUM]: 365, // 1 year
    [AuditSeverity.LOW]: 90, // 3 months
  };

  constructor(
    private auditLogRepository: Repository<AuditLog>,
  @InjectRepository(AuditLog)
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupExpiredLogs(): Promise<void> {
    this.logger.log("Starting audit log cleanup process")

    try {
      let totalDeleted = 0

      for (const [severity, retentionDays] of Object.entries(this.retentionPolicies)) {
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

        const result = await this.auditLogRepository.delete({
          severity: severity as AuditSeverity,
          createdAt: LessThan(cutoffDate),
        })

        const deletedCount = result.affected || 0
        totalDeleted += deletedCount

        this.logger.log(`Deleted ${deletedCount} ${severity} severity logs older than ${retentionDays} days`)
      }

      this.logger.log(`Audit log cleanup completed. Total deleted: ${totalDeleted}`)
    } catch (error) {
      this.logger.error("Failed to cleanup audit logs", error.stack)
    }
  }

  async getRetentionPolicy(): Promise<Record<AuditSeverity, number>> {
    return this.retentionPolicies
  }

  async updateRetentionPolicy(severity: AuditSeverity, days: number): Promise<void> {
    this.retentionPolicies[severity] = days
    this.logger.log(`Updated retention policy for ${severity}: ${days} days`)
  }

  async getLogsNearExpiration(daysBeforeExpiration = 7) {
    const results = []

    for (const [severity, retentionDays] of Object.entries(this.retentionPolicies)) {
      const warningDate = new Date()
      warningDate.setDate(warningDate.getDate() - (retentionDays - daysBeforeExpiration))

      const count = await this.auditLogRepository.count({
        where: {
          severity: severity as AuditSeverity,
          createdAt: LessThan(warningDate),
        },
      })

      if (count > 0) {
        results.push({
          severity,
          count,
          daysUntilExpiration: daysBeforeExpiration,
        })
      }
    }

    return results
  }
}
