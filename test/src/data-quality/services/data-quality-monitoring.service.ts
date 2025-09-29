import { Injectable, Logger } from "@nestjs/common"
import type { Repository } from "typeorm"
import { Cron, CronExpression } from "@nestjs/schedule"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { InjectQueue } from "@nestjs/bull"
import type { Queue } from "bull"

import type { DataQualityMetric } from "../entities/data-quality-metric.entity"
import type { DataQualityIssue } from "../entities/data-quality-issue.entity"

export interface QualityDashboard {
  overallScore: number
  categoryScores: Record<string, number>
  trendData: Array<{
    date: string
    score: number
    category: string
  }>
  activeIssues: number
  criticalIssues: number
  recentIssues: DataQualityIssue[]
  healthStatus: 'healthy' | 'warning' | 'critical'
  lastUpdated: Date
  entityCounts: Record<string, number>
  performanceMetrics: {
    avgProcessingTime: number
    totalChecksToday: number
    successRate: number
  }
}

export interface QualityAlert {
  id: string
  type: 'quality_issue' | 'threshold_breach' | 'system_alert'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  timestamp: Date
  entityType: string
  metadata?: Record<string, any>
  acknowledged: boolean
  resolvedAt?: Date
}

export interface RealTimeMetrics {
  currentScore: number
  trend: 'improving' | 'declining' | 'stable'
  activeChecks: number
  failureRate: number
  lastCheckTime: Date
}

@Injectable()
export class DataQualityMonitoringService {
  private readonly logger = new Logger(DataQualityMonitoringService.name)

  constructor(
    private readonly metricRepository: Repository<DataQualityMetric>,
    private readonly issueRepository: Repository<DataQualityIssue>,
    private readonly eventEmitter: EventEmitter2,
    @InjectQueue('data-quality-monitoring') private readonly monitoringQueue: Queue,
  ) {}

  async getDashboard(entityType?: string): Promise<QualityDashboard> {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30) // Last 30 days

    // Get overall score
    const overallScore = await this.calculateOverallScore(entityType, startDate, endDate)

    // Get category scores
    const categoryScores = await this.calculateCategoryScores(entityType, startDate, endDate)

    // Get trend data
    const trendData = await this.getTrendData(entityType, startDate, endDate)

    // Get issue counts
    const activeIssues = await this.issueRepository.count({
      where: {
        status: "open",
        ...(entityType && { entityType }),
      },
    })

    const criticalIssues = await this.issueRepository.count({
      where: {
        status: "open",
        priority: "critical",
        ...(entityType && { entityType }),
      },
    })

    // Get recent issues
    const recentIssues = await this.issueRepository.find({
      where: {
        ...(entityType && { entityType }),
      },
      order: { createdAt: "DESC" },
      take: 10,
    })

    // Calculate health status
    const healthStatus = this.calculateHealthStatus(overallScore, criticalIssues)
    
    // Get entity counts
    const entityCounts = await this.getEntityCounts(entityType)
    
    // Get performance metrics
    const performanceMetrics = await this.getPerformanceMetrics(entityType, startDate, endDate)

    return {
      overallScore,
      categoryScores,
      trendData,
      activeIssues,
      criticalIssues,
      recentIssues,
      healthStatus,
      lastUpdated: new Date(),
      entityCounts,
      performanceMetrics,
    }
  }

  private async calculateOverallScore(entityType?: string, startDate?: Date, endDate?: Date): Promise<number> {
    const query = this.metricRepository.createQueryBuilder("metric").select("AVG(metric.value)", "avgScore")

    if (entityType) {
      query.andWhere("metric.entityType = :entityType", { entityType })
    }

    if (startDate) {
      query.andWhere("metric.timestamp >= :startDate", { startDate })
    }

    if (endDate) {
      query.andWhere("metric.timestamp <= :endDate", { endDate })
    }

    const result = await query.getRawOne()
    return Number.parseFloat(result.avgScore) || 0
  }

  private async calculateCategoryScores(
    entityType?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<Record<string, number>> {
    const query = this.metricRepository
      .createQueryBuilder("metric")
      .select("metric.metricCategory", "category")
      .addSelect("AVG(metric.value)", "avgScore")
      .groupBy("metric.metricCategory")

    if (entityType) {
      query.andWhere("metric.entityType = :entityType", { entityType })
    }

    if (startDate) {
      query.andWhere("metric.timestamp >= :startDate", { startDate })
    }

    if (endDate) {
      query.andWhere("metric.timestamp <= :endDate", { endDate })
    }

    const results = await query.getRawMany()
    const categoryScores: Record<string, number> = {}

    for (const result of results) {
      categoryScores[result.category] = Number.parseFloat(result.avgScore) || 0
    }

    return categoryScores
  }

  private async getTrendData(
    entityType?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<
    Array<{
      date: string
      score: number
      category: string
    }>
  > {
    const query = this.metricRepository
      .createQueryBuilder("metric")
      .select("DATE(metric.timestamp)", "date")
      .addSelect("metric.metricCategory", "category")
      .addSelect("AVG(metric.value)", "score")
      .groupBy("DATE(metric.timestamp), metric.metricCategory")
      .orderBy("DATE(metric.timestamp)", "ASC")

    if (entityType) {
      query.andWhere("metric.entityType = :entityType", { entityType })
    }

    if (startDate) {
      query.andWhere("metric.timestamp >= :startDate", { startDate })
    }

    if (endDate) {
      query.andWhere("metric.timestamp <= :endDate", { endDate })
    }

    const results = await query.getRawMany()
    return results.map((result) => ({
      date: result.date,
      score: Number.parseFloat(result.score) || 0,
      category: result.category,
    }))
  }

  async getMetricHistory(
    metricName: string,
    entityType?: string,
    days = 30,
  ): Promise<
    Array<{
      timestamp: Date
      value: number
      passed: boolean
    }>
  > {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const query = this.metricRepository
      .createQueryBuilder("metric")
      .where("metric.metricName = :metricName", { metricName })
      .andWhere("metric.timestamp >= :startDate", { startDate })

    if (entityType) {
      query.andWhere("metric.entityType = :entityType", { entityType })
    }

    const metrics = await query.orderBy("metric.timestamp", "ASC").getMany()

    return metrics.map((metric) => ({
      timestamp: metric.timestamp,
      value: Number.parseFloat(metric.value.toString()),
      passed: metric.passed,
    }))
  }

  @Cron(CronExpression.EVERY_HOUR)
  async monitorQualityThresholds(): Promise<void> {
    this.logger.log("Starting quality threshold monitoring")

    try {
      const recentMetrics = await this.metricRepository.find({
        where: {
          timestamp: new Date(Date.now() - 60 * 60 * 1000), // Last hour
        },
      })

      for (const metric of recentMetrics) {
        if (metric.threshold && metric.value < metric.threshold) {
          this.logger.warn(
            `Quality threshold breach: ${metric.metricName} = ${metric.value} (threshold: ${metric.threshold})`,
          )
          // Could trigger alerts here
        }
      }
    } catch (error) {
      this.logger.error(`Quality monitoring failed: ${error.message}`, error.stack)
    }
  }

  async getQualityAlerts(entityType?: string): Promise<
    Array<{
      id: string
      type: string
      severity: string
      message: string
      timestamp: Date
      entityType: string
    }>
  > {
    const alerts: Array<{
      id: string
      type: string
      severity: string
      message: string
      timestamp: Date
      entityType: string
    }> = []

    // Get critical issues as alerts
    const criticalIssues = await this.issueRepository.find({
      where: {
        status: "open",
        priority: "critical",
        ...(entityType && { entityType }),
      },
      order: { createdAt: "DESC" },
      take: 50,
    })

    for (const issue of criticalIssues) {
      alerts.push({
        id: issue.id,
        type: "quality_issue",
        severity: issue.priority,
        message: issue.description,
        timestamp: issue.createdAt,
        entityType: issue.entityType,
      })
    }

    // Get threshold breaches
    const thresholdBreaches = await this.metricRepository.find({
      where: {
        passed: false,
        ...(entityType && { entityType }),
      },
      order: { timestamp: "DESC" },
      take: 50,
    })

    for (const breach of thresholdBreaches) {
      alerts.push({
        id: breach.id,
        type: "threshold_breach",
        severity: "high",
        message: `${breach.metricName} failed threshold: ${breach.value} < ${breach.threshold}`,
        timestamp: breach.timestamp,
        entityType: breach.entityType,
      })
    }

    return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  private calculateHealthStatus(overallScore: number, criticalIssues: number): 'healthy' | 'warning' | 'critical' {
    if (criticalIssues > 0 || overallScore < 60) {
      return 'critical'
    }
    if (overallScore < 80) {
      return 'warning'
    }
    return 'healthy'
  }

  private async getEntityCounts(entityType?: string): Promise<Record<string, number>> {
    const query = this.metricRepository
      .createQueryBuilder('metric')
      .select('metric.entityType', 'entityType')
      .addSelect('COUNT(*)', 'count')
      .groupBy('metric.entityType')

    if (entityType) {
      query.where('metric.entityType = :entityType', { entityType })
    }

    const results = await query.getRawMany()
    const counts: Record<string, number> = {}

    for (const result of results) {
      counts[result.entityType] = parseInt(result.count, 10)
    }

    return counts
  }

  private async getPerformanceMetrics(entityType?: string, startDate?: Date, endDate?: Date): Promise<{
    avgProcessingTime: number
    totalChecksToday: number
    successRate: number
  }> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Get total checks today
    const totalChecksQuery = this.metricRepository
      .createQueryBuilder('metric')
      .where('metric.timestamp >= :today', { today })

    if (entityType) {
      totalChecksQuery.andWhere('metric.entityType = :entityType', { entityType })
    }

    const totalChecksToday = await totalChecksQuery.getCount()

    // Get success rate
    const successQuery = this.metricRepository
      .createQueryBuilder('metric')
      .select('AVG(CASE WHEN metric.passed = true THEN 1 ELSE 0 END)', 'successRate')

    if (entityType) {
      successQuery.andWhere('metric.entityType = :entityType', { entityType })
    }

    if (startDate) {
      successQuery.andWhere('metric.timestamp >= :startDate', { startDate })
    }

    if (endDate) {
      successQuery.andWhere('metric.timestamp <= :endDate', { endDate })
    }

    const successResult = await successQuery.getRawOne()
    const successRate = parseFloat(successResult.successRate) * 100 || 0

    return {
      avgProcessingTime: 0, // This would need to be tracked separately
      totalChecksToday,
      successRate,
    }
  }

  async getRealTimeMetrics(entityType?: string): Promise<RealTimeMetrics> {
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

    // Get current score (last hour average)
    const currentScoreQuery = this.metricRepository
      .createQueryBuilder('metric')
      .select('AVG(metric.value)', 'avgScore')
      .where('metric.timestamp >= :oneHourAgo', { oneHourAgo })

    if (entityType) {
      currentScoreQuery.andWhere('metric.entityType = :entityType', { entityType })
    }

    const currentScoreResult = await currentScoreQuery.getRawOne()
    const currentScore = parseFloat(currentScoreResult.avgScore) || 0

    // Get trend (compare with previous hour)
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)
    const previousScoreQuery = this.metricRepository
      .createQueryBuilder('metric')
      .select('AVG(metric.value)', 'avgScore')
      .where('metric.timestamp >= :twoHoursAgo', { twoHoursAgo })
      .andWhere('metric.timestamp < :oneHourAgo', { oneHourAgo })

    if (entityType) {
      previousScoreQuery.andWhere('metric.entityType = :entityType', { entityType })
    }

    const previousScoreResult = await previousScoreQuery.getRawOne()
    const previousScore = parseFloat(previousScoreResult.avgScore) || 0

    let trend: 'improving' | 'declining' | 'stable' = 'stable'
    const scoreDiff = currentScore - previousScore
    if (Math.abs(scoreDiff) > 5) {
      trend = scoreDiff > 0 ? 'improving' : 'declining'
    }

    // Get active checks count
    const activeChecks = await this.metricRepository.count({
      where: {
        timestamp: new Date(now.getTime() - 5 * 60 * 1000), // Last 5 minutes
        ...(entityType && { entityType }),
      },
    })

    // Get failure rate
    const failureQuery = this.metricRepository
      .createQueryBuilder('metric')
      .select('AVG(CASE WHEN metric.passed = false THEN 1 ELSE 0 END)', 'failureRate')
      .where('metric.timestamp >= :oneHourAgo', { oneHourAgo })

    if (entityType) {
      failureQuery.andWhere('metric.entityType = :entityType', { entityType })
    }

    const failureResult = await failureQuery.getRawOne()
    const failureRate = parseFloat(failureResult.failureRate) * 100 || 0

    // Get last check time
    const lastCheckQuery = this.metricRepository
      .createQueryBuilder('metric')
      .select('MAX(metric.timestamp)', 'lastCheck')

    if (entityType) {
      lastCheckQuery.andWhere('metric.entityType = :entityType', { entityType })
    }

    const lastCheckResult = await lastCheckQuery.getRawOne()
    const lastCheckTime = lastCheckResult.lastCheck || now

    return {
      currentScore,
      trend,
      activeChecks,
      failureRate,
      lastCheckTime,
    }
  }

  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<void> {
    // This would update an alert acknowledgment table if we had one
    // For now, we'll emit an event
    this.eventEmitter.emit('alert.acknowledged', {
      alertId,
      acknowledgedBy,
      timestamp: new Date(),
    })
  }

  async scheduleQualityCheck(entityType: string, delay = 0): Promise<void> {
    await this.monitoringQueue.add(
      'quality-check',
      { entityType },
      { delay }
    )
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async performRealTimeMonitoring(): Promise<void> {
    try {
      const entityTypes = await this.getUniqueEntityTypes()
      
      for (const entityType of entityTypes) {
        const metrics = await this.getRealTimeMetrics(entityType)
        
        // Emit real-time metrics event
        this.eventEmitter.emit('metrics.realtime', {
          entityType,
          metrics,
          timestamp: new Date(),
        })

        // Check for critical conditions
        if (metrics.failureRate > 50) {
          this.eventEmitter.emit('alert.critical', {
            type: 'high_failure_rate',
            entityType,
            failureRate: metrics.failureRate,
            timestamp: new Date(),
          })
        }

        if (metrics.currentScore < 60) {
          this.eventEmitter.emit('alert.critical', {
            type: 'low_quality_score',
            entityType,
            score: metrics.currentScore,
            timestamp: new Date(),
          })
        }
      }
    } catch (error: any) {
      this.logger.error(`Real-time monitoring failed: ${error.message}`, error.stack)
    }
  }

  private async getUniqueEntityTypes(): Promise<string[]> {
    const result = await this.metricRepository
      .createQueryBuilder('metric')
      .select('DISTINCT metric.entityType', 'entityType')
      .getRawMany()

    return result.map((r: any) => r.entityType)
  }
}
