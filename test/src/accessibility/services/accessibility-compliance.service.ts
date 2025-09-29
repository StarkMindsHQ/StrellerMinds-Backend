import { Injectable, Logger } from "@nestjs/common"
import type { Repository } from "typeorm"

import type { AccessibilityMetadata } from "../entities/accessibility-metadata.entity"
import {
  type AccessibilityLog,
  AccessibilityEventType,
  SeverityLevel,
  WcagLevel,
} from "../entities/accessibility-log.entity"

export interface ComplianceRule {
  id: string
  name: string
  description: string
  wcagGuideline: string
  wcagLevel: WcagLevel
  severity: SeverityLevel
  check: (metadata: AccessibilityMetadata) => {
    passed: boolean
    message?: string
    suggestion?: string
  }
}

@Injectable()
export class AccessibilityComplianceService {
  private readonly logger = new Logger(AccessibilityComplianceService.name)
  private readonly complianceRules: ComplianceRule[] = []

  constructor(
    private readonly metadataRepository: Repository<AccessibilityMetadata>,
    private readonly logRepository: Repository<AccessibilityLog>,
  ) {
    this.initializeComplianceRules()
  }

  private initializeComplianceRules(): void {
    this.complianceRules.push(
      {
        id: "img-alt",
        name: "Images have alternative text",
        description: "All informative images must have alternative text",
        wcagGuideline: "1.1.1",
        wcagLevel: WcagLevel.A,
        severity: SeverityLevel.HIGH,
        check: (metadata) => {
          if (metadata.contentType === "image" && !metadata.isDecorative) {
            return {
              passed: !!metadata.altText,
              message: metadata.altText ? undefined : "Image missing alternative text",
              suggestion: "Add descriptive alt text that conveys the purpose and content of the image",
            }
          }
          return { passed: true }
        },
      },
      {
        id: "color-contrast",
        name: "Color contrast meets minimum requirements",
        description: "Text must have sufficient contrast against background",
        wcagGuideline: "1.4.3",
        wcagLevel: WcagLevel.AA,
        severity: SeverityLevel.MEDIUM,
        check: (metadata) => {
          if (metadata.colorContrast) {
            const minRatio = metadata.colorContrast.level === "AAA" ? 7 : 4.5
            return {
              passed: metadata.colorContrast.ratio >= minRatio,
              message:
                metadata.colorContrast.ratio >= minRatio
                  ? undefined
                  : `Color contrast ratio ${metadata.colorContrast.ratio} is below minimum ${minRatio}`,
              suggestion: `Increase color contrast to meet WCAG ${metadata.colorContrast.level} standards`,
            }
          }
          return { passed: true }
        },
      },
      {
        id: "form-labels",
        name: "Form elements have labels",
        description: "All form controls must have associated labels",
        wcagGuideline: "1.3.1",
        wcagLevel: WcagLevel.A,
        severity: SeverityLevel.HIGH,
        check: (metadata) => {
          if (metadata.contentType === "form") {
            return {
              passed: !!metadata.formLabels && Object.keys(metadata.formLabels).length > 0,
              message: metadata.formLabels ? undefined : "Form elements missing labels",
              suggestion: "Add proper labels for all form controls using <label> elements or aria-label",
            }
          }
          return { passed: true }
        },
      },
      {
        id: "heading-structure",
        name: "Headings follow proper hierarchy",
        description: "Headings must be properly structured and not skip levels",
        wcagGuideline: "1.3.1",
        wcagLevel: WcagLevel.A,
        severity: SeverityLevel.MEDIUM,
        check: (metadata) => {
          if (metadata.contentType === "heading") {
            return {
              passed: !!metadata.headingLevel && metadata.headingLevel >= 1 && metadata.headingLevel <= 6,
              message: metadata.headingLevel ? undefined : "Heading missing level information",
              suggestion: "Specify the appropriate heading level (h1-h6) based on content hierarchy",
            }
          }
          return { passed: true }
        },
      },
      {
        id: "keyboard-accessible",
        name: "Interactive elements are keyboard accessible",
        description: "All interactive elements must be reachable and operable via keyboard",
        wcagGuideline: "2.1.1",
        wcagLevel: WcagLevel.A,
        severity: SeverityLevel.HIGH,
        check: (metadata) => {
          if (metadata.isInteractive) {
            return {
              passed: !!metadata.focusManagement?.focusable,
              message: metadata.focusManagement?.focusable ? undefined : "Interactive element not keyboard accessible",
              suggestion: "Ensure element can receive keyboard focus and is operable with keyboard",
            }
          }
          return { passed: true }
        },
      },
      {
        id: "aria-roles",
        name: "ARIA roles are used appropriately",
        description: "ARIA roles must be valid and appropriate for the element",
        wcagGuideline: "4.1.2",
        wcagLevel: WcagLevel.A,
        severity: SeverityLevel.MEDIUM,
        check: (metadata) => {
          if (metadata.ariaRole) {
            const validRoles = Object.values(metadata.ariaRole)
            return {
              passed: validRoles.includes(metadata.ariaRole),
              message: validRoles.includes(metadata.ariaRole) ? undefined : "Invalid or inappropriate ARIA role",
              suggestion: "Use valid ARIA roles that match the element's purpose and behavior",
            }
          }
          return { passed: true }
        },
      },
    )
  }

  async runComplianceCheck(
    contentId?: string,
    entityType?: string,
    entityId?: string,
  ): Promise<{
    summary: {
      totalChecked: number
      passed: number
      failed: number
      warnings: number
      complianceRate: number
    }
    results: Array<{
      contentId: string
      contentType: string
      ruleId: string
      ruleName: string
      passed: boolean
      severity: SeverityLevel
      wcagGuideline: string
      wcagLevel: WcagLevel
      message?: string
      suggestion?: string
    }>
  }> {
    try {
      let query = this.metadataRepository.createQueryBuilder("metadata")

      if (contentId) {
        query = query.where("metadata.contentId = :contentId", { contentId })
      } else if (entityType && entityId) {
        query = query
          .where("metadata.entityType = :entityType", { entityType })
          .andWhere("metadata.entityId = :entityId", { entityId })
      }

      const metadataItems = await query.getMany()
      const results = []
      let totalChecked = 0
      let passed = 0
      let failed = 0
      let warnings = 0

      for (const metadata of metadataItems) {
        for (const rule of this.complianceRules) {
          const checkResult = rule.check(metadata)

          if (checkResult.passed !== undefined) {
            totalChecked++

            const result = {
              contentId: metadata.contentId,
              contentType: metadata.contentType,
              ruleId: rule.id,
              ruleName: rule.name,
              passed: checkResult.passed,
              severity: rule.severity,
              wcagGuideline: rule.wcagGuideline,
              wcagLevel: rule.wcagLevel,
              message: checkResult.message,
              suggestion: checkResult.suggestion,
            }

            results.push(result)

            if (checkResult.passed) {
              passed++
            } else {
              failed++
              if (rule.severity === SeverityLevel.LOW || rule.severity === SeverityLevel.MEDIUM) {
                warnings++
              }

              // Log the violation
              await this.logAccessibilityViolation({
                contentId: metadata.contentId,
                ruleId: rule.id,
                ruleName: rule.name,
                severity: rule.severity,
                wcagGuideline: rule.wcagGuideline,
                wcagLevel: rule.wcagLevel,
                description: checkResult.message || rule.description,
                suggestion: checkResult.suggestion || "",
                elementSelector: metadata.customAttributes?.selector,
                pageUrl: metadata.customAttributes?.pageUrl,
              })
            }
          }
        }
      }

      const complianceRate = totalChecked > 0 ? (passed / totalChecked) * 100 : 100

      return {
        summary: {
          totalChecked,
          passed,
          failed,
          warnings,
          complianceRate: Math.round(complianceRate * 100) / 100,
        },
        results,
      }
    } catch (error) {
      this.logger.error(`Failed to run compliance check: ${error.message}`, error.stack)
      throw error
    }
  }

  async logAccessibilityViolation(violation: {
    contentId: string
    ruleId: string
    ruleName: string
    severity: SeverityLevel
    wcagGuideline: string
    wcagLevel: WcagLevel
    description: string
    suggestion: string
    elementSelector?: string
    pageUrl?: string
    userId?: string
    sessionId?: string
    userAgent?: string
  }): Promise<AccessibilityLog> {
    try {
      const log = this.logRepository.create({
        eventType: AccessibilityEventType.VIOLATION,
        severityLevel: violation.severity,
        wcagGuideline: violation.wcagGuideline,
        wcagLevel: violation.wcagLevel,
        ruleId: violation.ruleId,
        elementSelector: violation.elementSelector,
        pageUrl: violation.pageUrl,
        userId: violation.userId,
        sessionId: violation.sessionId,
        userAgent: violation.userAgent,
        title: violation.ruleName,
        description: violation.description,
        helpText: violation.suggestion,
        contextData: {
          contentId: violation.contentId,
        },
      })

      const saved = await this.logRepository.save(log)

      this.logger.warn(`Accessibility violation logged: ${violation.ruleName} for content ${violation.contentId}`)
      return saved
    } catch (error) {
      this.logger.error(`Failed to log accessibility violation: ${error.message}`, error.stack)
      throw error
    }
  }

  async getComplianceHistory(
    contentId?: string,
    timeRange?: { start: Date; end: Date },
  ): Promise<
    Array<{
      date: string
      totalChecks: number
      passed: number
      failed: number
      complianceRate: number
    }>
  > {
    try {
      let query = this.logRepository
        .createQueryBuilder("log")
        .select([
          "DATE(log.createdAt) as date",
          "COUNT(*) as totalChecks",
          "SUM(CASE WHEN log.eventType = :violation THEN 1 ELSE 0 END) as failed",
          "SUM(CASE WHEN log.eventType != :violation THEN 1 ELSE 0 END) as passed",
        ])
        .where("log.eventType IN (:...eventTypes)", {
          eventTypes: [AccessibilityEventType.VIOLATION, AccessibilityEventType.COMPLIANCE_CHECK],
        })
        .setParameter("violation", AccessibilityEventType.VIOLATION)
        .groupBy("DATE(log.createdAt)")
        .orderBy("DATE(log.createdAt)", "DESC")

      if (contentId) {
        query = query.andWhere("log.contextData ->> :key = :contentId", {
          key: "contentId",
          contentId,
        })
      }

      if (timeRange) {
        query = query
          .andWhere("log.createdAt >= :start", { start: timeRange.start })
          .andWhere("log.createdAt <= :end", { end: timeRange.end })
      }

      const results = await query.getRawMany()

      return results.map((result) => ({
        date: result.date,
        totalChecks: Number.parseInt(result.totalChecks),
        passed: Number.parseInt(result.passed),
        failed: Number.parseInt(result.failed),
        complianceRate: result.totalChecks > 0 ? Math.round((result.passed / result.totalChecks) * 10000) / 100 : 100,
      }))
    } catch (error) {
      this.logger.error(`Failed to get compliance history: ${error.message}`, error.stack)
      return []
    }
  }

  async generateComplianceReport(
    entityType?: string,
    entityId?: string,
  ): Promise<{
    overview: {
      totalItems: number
      compliantItems: number
      overallComplianceRate: number
      criticalViolations: number
      highViolations: number
      mediumViolations: number
      lowViolations: number
    }
    wcagCompliance: {
      levelA: { total: number; compliant: number; rate: number }
      levelAA: { total: number; compliant: number; rate: number }
      levelAAA: { total: number; compliant: number; rate: number }
    }
    topViolations: Array<{
      ruleId: string
      ruleName: string
      count: number
      severity: SeverityLevel
      wcagGuideline: string
    }>
    recommendations: string[]
  }> {
    try {
      const checkResult = await this.runComplianceCheck(undefined, entityType, entityId)

      // Get violation statistics
      let query = this.logRepository
        .createQueryBuilder("log")
        .where("log.eventType = :eventType", { eventType: AccessibilityEventType.VIOLATION })

      if (entityType && entityId) {
        query = query
          .andWhere("log.contextData ->> :entityTypeKey = :entityType", {
            entityTypeKey: "entityType",
            entityType,
          })
          .andWhere("log.contextData ->> :entityIdKey = :entityId", {
            entityIdKey: "entityId",
            entityId,
          })
      }

      const violations = await query.getMany()

      const violationsBySeverity = violations.reduce(
        (acc, violation) => {
          acc[violation.severityLevel] = (acc[violation.severityLevel] || 0) + 1
          return acc
        },
        {} as Record<SeverityLevel, number>,
      )

      const violationsByRule = violations.reduce(
        (acc, violation) => {
          const key = violation.ruleId || "unknown"
          if (!acc[key]) {
            acc[key] = {
              ruleId: violation.ruleId || "unknown",
              ruleName: violation.title,
              count: 0,
              severity: violation.severityLevel,
              wcagGuideline: violation.wcagGuideline || "",
            }
          }
          acc[key].count++
          return acc
        },
        {} as Record<string, any>,
      )

      const topViolations = Object.values(violationsByRule)
        .sort((a: any, b: any) => b.count - a.count)
        .slice(0, 10)

      // Calculate WCAG compliance by level
      const wcagCompliance = {
        levelA: { total: 0, compliant: 0, rate: 0 },
        levelAA: { total: 0, compliant: 0, rate: 0 },
        levelAAA: { total: 0, compliant: 0, rate: 0 },
      }

      checkResult.results.forEach((result) => {
        const level = `level${result.wcagLevel}` as keyof typeof wcagCompliance
        wcagCompliance[level].total++
        if (result.passed) {
          wcagCompliance[level].compliant++
        }
      })

      Object.keys(wcagCompliance).forEach((level) => {
        const levelData = wcagCompliance[level as keyof typeof wcagCompliance]
        levelData.rate = levelData.total > 0 ? Math.round((levelData.compliant / levelData.total) * 10000) / 100 : 100
      })

      const recommendations = this.generateComplianceRecommendations(topViolations)

      return {
        overview: {
          totalItems: checkResult.summary.totalChecked,
          compliantItems: checkResult.summary.passed,
          overallComplianceRate: checkResult.summary.complianceRate,
          criticalViolations: violationsBySeverity[SeverityLevel.CRITICAL] || 0,
          highViolations: violationsBySeverity[SeverityLevel.HIGH] || 0,
          mediumViolations: violationsBySeverity[SeverityLevel.MEDIUM] || 0,
          lowViolations: violationsBySeverity[SeverityLevel.LOW] || 0,
        },
        wcagCompliance,
        topViolations,
        recommendations,
      }
    } catch (error) {
      this.logger.error(`Failed to generate compliance report: ${error.message}`, error.stack)
      throw error
    }
  }

  private generateComplianceRecommendations(topViolations: any[]): string[] {
    const recommendations: string[] = []

    topViolations.forEach((violation) => {
      switch (violation.ruleId) {
        case "img-alt":
          recommendations.push("Add alternative text to all informative images")
          break
        case "color-contrast":
          recommendations.push("Improve color contrast ratios to meet WCAG standards")
          break
        case "form-labels":
          recommendations.push("Ensure all form controls have proper labels")
          break
        case "heading-structure":
          recommendations.push("Maintain proper heading hierarchy (h1-h6)")
          break
        case "keyboard-accessible":
          recommendations.push("Make all interactive elements keyboard accessible")
          break
        case "aria-roles":
          recommendations.push("Use appropriate ARIA roles and attributes")
          break
        default:
          recommendations.push(`Address ${violation.ruleName} violations`)
      }
    })

    return [...new Set(recommendations)] // Remove duplicates
  }
}
