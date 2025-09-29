import { Injectable, Logger } from "@nestjs/common"
import type { Repository } from "typeorm"

import { type AccessibilityMetadata, ContentType, type AriaRole } from "../entities/accessibility-metadata.entity"

export interface BulkMetadataOperation {
  contentId: string
  contentType: ContentType
  metadata: Partial<AccessibilityMetadata>
}

@Injectable()
export class AccessibilityMetadataService {
  private readonly logger = new Logger(AccessibilityMetadataService.name)

  constructor(private readonly metadataRepository: Repository<AccessibilityMetadata>) {}

  async bulkCreateMetadata(operations: BulkMetadataOperation[]): Promise<AccessibilityMetadata[]> {
    try {
      const entities = operations.map((op) =>
        this.metadataRepository.create({
          contentId: op.contentId,
          contentType: op.contentType,
          ...op.metadata,
          validationStatus: "pending",
        }),
      )

      const saved = await this.metadataRepository.save(entities)

      this.logger.log(`Bulk created ${saved.length} accessibility metadata records`)
      return saved
    } catch (error) {
      this.logger.error(`Failed to bulk create metadata: ${error.message}`, error.stack)
      throw error
    }
  }

  async bulkUpdateMetadata(
    updates: Array<{
      contentId: string
      metadata: Partial<AccessibilityMetadata>
    }>,
  ): Promise<void> {
    try {
      for (const update of updates) {
        await this.metadataRepository.update(
          { contentId: update.contentId },
          { ...update.metadata, validationStatus: "pending" },
        )
      }

      this.logger.log(`Bulk updated ${updates.length} accessibility metadata records`)
    } catch (error) {
      this.logger.error(`Failed to bulk update metadata: ${error.message}`, error.stack)
      throw error
    }
  }

  async getMetadataByEntity(entityType: string, entityId: string): Promise<AccessibilityMetadata[]> {
    try {
      return await this.metadataRepository.find({
        where: { entityType, entityId },
        order: { createdAt: "DESC" },
      })
    } catch (error) {
      this.logger.error(`Failed to get metadata by entity: ${error.message}`, error.stack)
      return []
    }
  }

  async searchMetadata(filters: {
    contentType?: ContentType
    ariaRole?: AriaRole
    languageCode?: string
    validationStatus?: AccessibilityMetadata["validationStatus"]
    complianceLevel?: AccessibilityMetadata["complianceLevel"]
    hasViolations?: boolean
    isInteractive?: boolean
    requiresJavascript?: boolean
  }): Promise<AccessibilityMetadata[]> {
    try {
      const query = this.metadataRepository.createQueryBuilder("metadata")

      if (filters.contentType) {
        query.andWhere("metadata.contentType = :contentType", {
          contentType: filters.contentType,
        })
      }

      if (filters.ariaRole) {
        query.andWhere("metadata.ariaRole = :ariaRole", {
          ariaRole: filters.ariaRole,
        })
      }

      if (filters.languageCode) {
        query.andWhere("metadata.languageCode = :languageCode", {
          languageCode: filters.languageCode,
        })
      }

      if (filters.validationStatus) {
        query.andWhere("metadata.validationStatus = :validationStatus", {
          validationStatus: filters.validationStatus,
        })
      }

      if (filters.complianceLevel) {
        query.andWhere("metadata.complianceLevel = :complianceLevel", {
          complianceLevel: filters.complianceLevel,
        })
      }

      if (filters.hasViolations !== undefined) {
        if (filters.hasViolations) {
          query.andWhere("metadata.validationErrors IS NOT NULL")
          query.andWhere("jsonb_array_length(metadata.validationErrors) > 0")
        } else {
          query.andWhere("(metadata.validationErrors IS NULL OR jsonb_array_length(metadata.validationErrors) = 0)")
        }
      }

      if (filters.isInteractive !== undefined) {
        query.andWhere("metadata.isInteractive = :isInteractive", {
          isInteractive: filters.isInteractive,
        })
      }

      if (filters.requiresJavascript !== undefined) {
        query.andWhere("metadata.requiresJavascript = :requiresJavascript", {
          requiresJavascript: filters.requiresJavascript,
        })
      }

      return await query.getMany()
    } catch (error) {
      this.logger.error(`Failed to search metadata: ${error.message}`, error.stack)
      return []
    }
  }

  async getComplianceStats(): Promise<{
    total: number
    byLevel: Record<"A" | "AA" | "AAA", number>
    byStatus: Record<AccessibilityMetadata["validationStatus"], number>
    byContentType: Record<ContentType, number>
    violationsCount: number
    warningsCount: number
  }> {
    try {
      const [total, byLevel, byStatus, byContentType, violationsData, warningsData] = await Promise.all([
        this.metadataRepository.count(),
        this.metadataRepository
          .createQueryBuilder("metadata")
          .select("metadata.complianceLevel", "level")
          .addSelect("COUNT(*)", "count")
          .groupBy("metadata.complianceLevel")
          .getRawMany(),
        this.metadataRepository
          .createQueryBuilder("metadata")
          .select("metadata.validationStatus", "status")
          .addSelect("COUNT(*)", "count")
          .groupBy("metadata.validationStatus")
          .getRawMany(),
        this.metadataRepository
          .createQueryBuilder("metadata")
          .select("metadata.contentType", "type")
          .addSelect("COUNT(*)", "count")
          .groupBy("metadata.contentType")
          .getRawMany(),
        this.metadataRepository
          .createQueryBuilder("metadata")
          .select("SUM(jsonb_array_length(COALESCE(metadata.validationErrors, '[]')))", "count")
          .getRawOne(),
        this.metadataRepository
          .createQueryBuilder("metadata")
          .select("SUM(jsonb_array_length(COALESCE(metadata.validationWarnings, '[]')))", "count")
          .getRawOne(),
      ])

      return {
        total,
        byLevel: byLevel.reduce(
          (acc, item) => {
            acc[item.level] = Number.parseInt(item.count)
            return acc
          },
          { A: 0, AA: 0, AAA: 0 },
        ),
        byStatus: byStatus.reduce(
          (acc, item) => {
            acc[item.status] = Number.parseInt(item.count)
            return acc
          },
          { pending: 0, valid: 0, invalid: 0, warning: 0 },
        ),
        byContentType: byContentType.reduce(
          (acc, item) => {
            acc[item.type] = Number.parseInt(item.count)
            return acc
          },
          {} as Record<ContentType, number>,
        ),
        violationsCount: Number.parseInt(violationsData?.count || "0"),
        warningsCount: Number.parseInt(warningsData?.count || "0"),
      }
    } catch (error) {
      this.logger.error(`Failed to get compliance stats: ${error.message}`, error.stack)
      throw error
    }
  }

  async generateAccessibilityReport(
    entityType?: string,
    entityId?: string,
  ): Promise<{
    summary: {
      totalItems: number
      compliantItems: number
      complianceRate: number
      criticalIssues: number
      warnings: number
    }
    details: {
      byContentType: Record<
        string,
        {
          total: number
          compliant: number
          issues: string[]
        }
      >
      commonIssues: Array<{
        issue: string
        count: number
        severity: string
      }>
      recommendations: string[]
    }
  }> {
    try {
      let query = this.metadataRepository.createQueryBuilder("metadata")

      if (entityType && entityId) {
        query = query
          .where("metadata.entityType = :entityType", { entityType })
          .andWhere("metadata.entityId = :entityId", { entityId })
      }

      const metadata = await query.getMany()

      const totalItems = metadata.length
      const compliantItems = metadata.filter((m) => m.validationStatus === "valid").length
      const complianceRate = totalItems > 0 ? (compliantItems / totalItems) * 100 : 0

      const criticalIssues = metadata.reduce((count, m) => {
        return count + (m.validationErrors?.length || 0)
      }, 0)

      const warnings = metadata.reduce((count, m) => {
        return count + (m.validationWarnings?.length || 0)
      }, 0)

      const byContentType = metadata.reduce(
        (acc, m) => {
          const type = m.contentType
          if (!acc[type]) {
            acc[type] = { total: 0, compliant: 0, issues: [] }
          }
          acc[type].total++
          if (m.validationStatus === "valid") {
            acc[type].compliant++
          }
          if (m.validationErrors) {
            acc[type].issues.push(...m.validationErrors)
          }
          return acc
        },
        {} as Record<string, { total: number; compliant: number; issues: string[] }>,
      )

      // Count common issues
      const allIssues = metadata.flatMap((m) => m.validationErrors || [])
      const issueCount = allIssues.reduce(
        (acc, issue) => {
          acc[issue] = (acc[issue] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      )

      const commonIssues = Object.entries(issueCount)
        .map(([issue, count]) => ({
          issue,
          count,
          severity: this.getIssueSeverity(issue),
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      const recommendations = this.generateRecommendations(metadata)

      return {
        summary: {
          totalItems,
          compliantItems,
          complianceRate: Math.round(complianceRate * 100) / 100,
          criticalIssues,
          warnings,
        },
        details: {
          byContentType,
          commonIssues,
          recommendations,
        },
      }
    } catch (error) {
      this.logger.error(`Failed to generate accessibility report: ${error.message}`, error.stack)
      throw error
    }
  }

  private getIssueSeverity(issue: string): string {
    const criticalKeywords = ["missing", "required", "invalid"]
    const highKeywords = ["contrast", "keyboard", "focus"]
    const mediumKeywords = ["label", "description", "title"]

    const lowerIssue = issue.toLowerCase()

    if (criticalKeywords.some((keyword) => lowerIssue.includes(keyword))) {
      return "critical"
    }
    if (highKeywords.some((keyword) => lowerIssue.includes(keyword))) {
      return "high"
    }
    if (mediumKeywords.some((keyword) => lowerIssue.includes(keyword))) {
      return "medium"
    }
    return "low"
  }

  private generateRecommendations(metadata: AccessibilityMetadata[]): string[] {
    const recommendations: string[] = []

    const imagesWithoutAlt = metadata.filter(
      (m) => m.contentType === ContentType.IMAGE && !m.isDecorative && !m.altText,
    ).length

    if (imagesWithoutAlt > 0) {
      recommendations.push(`Add alternative text to ${imagesWithoutAlt} images`)
    }

    const formsWithoutLabels = metadata.filter((m) => m.contentType === ContentType.FORM && !m.formLabels).length

    if (formsWithoutLabels > 0) {
      recommendations.push(`Add proper labels to ${formsWithoutLabels} form elements`)
    }

    const lowContrastElements = metadata.filter((m) => m.colorContrast && m.colorContrast.ratio < 4.5).length

    if (lowContrastElements > 0) {
      recommendations.push(`Improve color contrast for ${lowContrastElements} elements`)
    }

    const interactiveWithoutKeyboard = metadata.filter((m) => m.isInteractive && !m.focusManagement?.focusable).length

    if (interactiveWithoutKeyboard > 0) {
      recommendations.push(`Make ${interactiveWithoutKeyboard} interactive elements keyboard accessible`)
    }

    return recommendations
  }
}
