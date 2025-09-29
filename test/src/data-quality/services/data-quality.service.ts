import { Injectable, Logger } from "@nestjs/common"
import type { Repository } from "typeorm"
import type { Queue } from "bull"

import { type DataQualityRule, RuleStatus } from "../entities/data-quality-rule.entity"
import type { DataQualityMetric } from "../entities/data-quality-metric.entity"
import type { DataQualityIssue } from "../entities/data-quality-issue.entity"
import type { DataValidationService } from "./data-validation.service"
import type { DataQualityMonitoringService } from "./data-quality-monitoring.service"

export interface QualityCheckResult {
  passed: boolean
  score: number
  issues: Array<{
    ruleId: string
    severity: string
    message: string
    data?: any
  }>
  metrics: Array<{
    name: string
    value: number
    category: string
  }>
}

@Injectable()
export class DataQualityService {
  private readonly logger = new Logger(DataQualityService.name)

  constructor(
    private readonly ruleRepository: Repository<DataQualityRule>,
    private readonly metricRepository: Repository<DataQualityMetric>,
    private readonly issueRepository: Repository<DataQualityIssue>,
    private readonly dataQualityQueue: Queue,
    private readonly validationService: DataValidationService,
    private readonly monitoringService: DataQualityMonitoringService,
  ) {}

  async checkDataQuality(entityType: string, data: any[]): Promise<QualityCheckResult> {
    try {
      const rules = await this.getActiveRules(entityType)
      const result: QualityCheckResult = {
        passed: true,
        score: 100,
        issues: [],
        metrics: [],
      }

      let totalScore = 0
      let ruleCount = 0

      for (const rule of rules) {
        const ruleResult = await this.validateRule(rule, data)

        if (!ruleResult.passed) {
          result.passed = false
          result.issues.push({
            ruleId: rule.id,
            severity: rule.severity,
            message: rule.errorMessage || `Rule ${rule.name} failed`,
            data: ruleResult.failedData,
          })

          // Create issue record
          await this.createOrUpdateIssue(rule, ruleResult)
        }

        // Record metric
        await this.recordMetric(rule, ruleResult)

        totalScore += ruleResult.score
        ruleCount++

        result.metrics.push({
          name: rule.name,
          value: ruleResult.score,
          category: rule.ruleType,
        })
      }

      result.score = ruleCount > 0 ? totalScore / ruleCount : 100

      // Queue for background processing
      await this.dataQualityQueue.add("process-quality-check", {
        entityType,
        result,
        timestamp: new Date(),
      })

      return result
    } catch (error) {
      this.logger.error(`Data quality check failed: ${error.message}`, error.stack)
      throw error
    }
  }

  async getActiveRules(entityType: string): Promise<DataQualityRule[]> {
    return this.ruleRepository.find({
      where: {
        entityType,
        status: RuleStatus.ACTIVE,
      },
      order: {
        severity: "DESC",
        createdAt: "ASC",
      },
    })
  }

  async createRule(ruleData: Partial<DataQualityRule>): Promise<DataQualityRule> {
    const rule = this.ruleRepository.create(ruleData)
    return this.ruleRepository.save(rule)
  }

  async updateRule(id: string, updates: Partial<DataQualityRule>): Promise<DataQualityRule> {
    await this.ruleRepository.update(id, updates)
    const rule = await this.ruleRepository.findOne({ where: { id } })
    if (!rule) {
      throw new Error(`Rule with id ${id} not found`)
    }
    return rule
  }

  async deleteRule(id: string): Promise<void> {
    await this.ruleRepository.update(id, { status: RuleStatus.DEPRECATED })
  }

  async getRules(filters: {
    entityType?: string
    ruleType?: string
    status?: RuleStatus
    severity?: string
  }): Promise<DataQualityRule[]> {
    const query = this.ruleRepository.createQueryBuilder("rule")

    if (filters.entityType) {
      query.andWhere("rule.entityType = :entityType", { entityType: filters.entityType })
    }

    if (filters.ruleType) {
      query.andWhere("rule.ruleType = :ruleType", { ruleType: filters.ruleType })
    }

    if (filters.status) {
      query.andWhere("rule.status = :status", { status: filters.status })
    }

    if (filters.severity) {
      query.andWhere("rule.severity = :severity", { severity: filters.severity })
    }

    return query.orderBy("rule.createdAt", "DESC").getMany()
  }

  private async validateRule(
    rule: DataQualityRule,
    data: any[],
  ): Promise<{
    passed: boolean
    score: number
    failedData?: any[]
    details?: any
  }> {
    try {
      switch (rule.ruleType) {
        case "completeness":
          return this.validationService.checkCompleteness(rule, data)
        case "accuracy":
          return this.validationService.checkAccuracy(rule, data)
        case "consistency":
          return this.validationService.checkConsistency(rule, data)
        case "validity":
          return this.validationService.checkValidity(rule, data)
        case "uniqueness":
          return this.validationService.checkUniqueness(rule, data)
        case "timeliness":
          return this.validationService.checkTimeliness(rule, data)
        case "conformity":
          return this.validationService.checkConformity(rule, data)
        default:
          return { passed: true, score: 100 }
      }
    } catch (error) {
      this.logger.error(`Rule validation failed for ${rule.name}: ${error.message}`)
      return { passed: false, score: 0, details: { error: error.message } }
    }
  }

  private async recordMetric(rule: DataQualityRule, result: any): Promise<void> {
    const metric = this.metricRepository.create({
      ruleId: rule.id,
      entityType: rule.entityType,
      metricCategory: rule.ruleType as any,
      metricName: rule.name,
      value: result.score,
      threshold: rule.threshold,
      passed: result.passed,
      details: result.details,
      timestamp: new Date(),
    })

    await this.metricRepository.save(metric)
  }

  private async createOrUpdateIssue(rule: DataQualityRule, result: any): Promise<void> {
    const existingIssue = await this.issueRepository.findOne({
      where: {
        ruleId: rule.id,
        status: "open",
      },
    })

    if (existingIssue) {
      // Update existing issue
      existingIssue.occurrenceCount += 1
      existingIssue.lastOccurrence = new Date()
      existingIssue.issueData = result.failedData || {}
      await this.issueRepository.save(existingIssue)
    } else {
      // Create new issue
      const issue = this.issueRepository.create({
        ruleId: rule.id,
        entityType: rule.entityType,
        title: `Data Quality Issue: ${rule.name}`,
        description: rule.errorMessage || `Rule ${rule.name} validation failed`,
        priority: rule.severity as any,
        issueData: result.failedData || {},
        context: result.details,
        occurrenceCount: 1,
        firstOccurrence: new Date(),
        lastOccurrence: new Date(),
      })
      await this.issueRepository.save(issue)
    }
  }

  async getQualityMetrics(filters: {
    entityType?: string
    startDate?: Date
    endDate?: Date
    metricCategory?: string
  }): Promise<DataQualityMetric[]> {
    const query = this.metricRepository.createQueryBuilder("metric")

    if (filters.entityType) {
      query.andWhere("metric.entityType = :entityType", { entityType: filters.entityType })
    }

    if (filters.startDate) {
      query.andWhere("metric.timestamp >= :startDate", { startDate: filters.startDate })
    }

    if (filters.endDate) {
      query.andWhere("metric.timestamp <= :endDate", { endDate: filters.endDate })
    }

    if (filters.metricCategory) {
      query.andWhere("metric.metricCategory = :metricCategory", { metricCategory: filters.metricCategory })
    }

    return query.orderBy("metric.timestamp", "DESC").getMany()
  }

  async getQualityIssues(filters: {
    status?: string
    priority?: string
    entityType?: string
    assignedTo?: string
  }): Promise<DataQualityIssue[]> {
    const query = this.issueRepository.createQueryBuilder("issue")

    if (filters.status) {
      query.andWhere("issue.status = :status", { status: filters.status })
    }

    if (filters.priority) {
      query.andWhere("issue.priority = :priority", { priority: filters.priority })
    }

    if (filters.entityType) {
      query.andWhere("issue.entityType = :entityType", { entityType: filters.entityType })
    }

    if (filters.assignedTo) {
      query.andWhere("issue.assignedTo = :assignedTo", { assignedTo: filters.assignedTo })
    }

    return query.orderBy("issue.createdAt", "DESC").getMany()
  }

  async resolveIssue(issueId: string, resolution: string, resolvedBy: string): Promise<void> {
    await this.issueRepository.update(issueId, {
      status: "resolved" as any,
      resolution,
      resolvedBy,
      resolvedAt: new Date(),
    })
  }
}
