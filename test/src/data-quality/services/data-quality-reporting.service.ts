import { Injectable, Logger } from "@nestjs/common"
import type { Repository } from "typeorm"
import { Cron, CronExpression } from "@nestjs/schedule"

import { type DataQualityReport, ReportType, ReportStatus } from "../entities/data-quality-report.entity"
import type { DataQualityMetric } from "../entities/data-quality-metric.entity"
import type { DataQualityIssue } from "../entities/data-quality-issue.entity"
import type { DataQualityMonitoringService } from "./data-quality-monitoring.service"

@Injectable()
export class DataQualityReportingService {
  private readonly logger = new Logger(DataQualityReportingService.name)

  constructor(
    private readonly reportRepository: Repository<DataQualityReport>,
    private readonly metricRepository: Repository<DataQualityMetric>,
    private readonly issueRepository: Repository<DataQualityIssue>,
    private readonly monitoringService: DataQualityMonitoringService,
  ) {}

  async generateReport(reportType: ReportType, startDate: Date, endDate: Date): Promise<DataQualityReport> {
    try {
      const report = this.reportRepository.create({
        name: `Data Quality Report - ${reportType}`,
        reportType,
        status: ReportStatus.GENERATING,
        reportDate: new Date(),
        startDate,
        endDate,
        summary: {},
        metrics: {},
      })

      const savedReport = await this.reportRepository.save(report)

      // Generate report content
      const reportData = await this.generateReportData(startDate, endDate)

      savedReport.summary = reportData.summary
      savedReport.metrics = reportData.metrics
      savedReport.issues = reportData.issues
      savedReport.recommendations = reportData.recommendations
      savedReport.status = ReportStatus.COMPLETED

      return this.reportRepository.save(savedReport)
    } catch (error) {
      this.logger.error(`Report generation failed: ${error.message}`, error.stack)
      throw error
    }
  }

  private async generateReportData(
    startDate: Date,
    endDate: Date,
  ): Promise<{
    summary: Record<string, any>
    metrics: Record<string, any>
    issues: Record<string, any>
    recommendations: Record<string, any>
  }> {
    // Get overall metrics
    const overallScore = await this.calculateOverallScore(startDate, endDate)
    const categoryScores = await this.calculateCategoryScores(startDate, endDate)

    // Get issue statistics
    const totalIssues = await this.issueRepository.count({
      where: {
        createdAt: new Date(startDate.getTime()),
      },
    })

    const resolvedIssues = await this.issueRepository.count({
      where: {
        status: "resolved",
        resolvedAt: new Date(startDate.getTime()),
      },
    })

    const criticalIssues = await this.issueRepository.count({
      where: {
        priority: "critical",
        status: "open",
      },
    })

    // Get top issues
    const topIssues = await this.issueRepository.find({
      where: {
        createdAt: new Date(startDate.getTime()),
      },
      order: { occurrenceCount: "DESC" },
      take: 10,
    })

    // Get metric trends
    const metricTrends = await this.getMetricTrends(startDate, endDate)

    // Generate recommendations
    const recommendations = this.generateRecommendations(overallScore, categoryScores, criticalIssues)

    return {
      summary: {
        reportPeriod: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        overallScore,
        totalIssues,
        resolvedIssues,
        criticalIssues,
        resolutionRate: totalIssues > 0 ? (resolvedIssues / totalIssues) * 100 : 100,
      },
      metrics: {
        categoryScores,
        trends: metricTrends,
        topPerformingCategories: this.getTopCategories(categoryScores, true),
        underPerformingCategories: this.getTopCategories(categoryScores, false),
      },
      issues: {
        topIssues: topIssues.map((issue) => ({
          id: issue.id,
          title: issue.title,
          priority: issue.priority,
          occurrenceCount: issue.occurrenceCount,
          entityType: issue.entityType,
        })),
        issuesByCategory: await this.getIssuesByCategory(startDate, endDate),
        issuesByPriority: await this.getIssuesByPriority(startDate, endDate),
      },
      recommendations: {
        immediate: recommendations.immediate,
        shortTerm: recommendations.shortTerm,
        longTerm: recommendations.longTerm,
      },
    }
  }

  private async calculateOverallScore(startDate: Date, endDate: Date): Promise<number> {
    const result = await this.metricRepository
      .createQueryBuilder("metric")
      .select("AVG(metric.value)", "avgScore")
      .where("metric.timestamp >= :startDate", { startDate })
      .andWhere("metric.timestamp <= :endDate", { endDate })
      .getRawOne()

    return Number.parseFloat(result.avgScore) || 0
  }

  private async calculateCategoryScores(startDate: Date, endDate: Date): Promise<Record<string, number>> {
    const results = await this.metricRepository
      .createQueryBuilder("metric")
      .select("metric.metricCategory", "category")
      .addSelect("AVG(metric.value)", "avgScore")
      .where("metric.timestamp >= :startDate", { startDate })
      .andWhere("metric.timestamp <= :endDate", { endDate })
      .groupBy("metric.metricCategory")
      .getRawMany()

    const categoryScores: Record<string, number> = {}
    for (const result of results) {
      categoryScores[result.category] = Number.parseFloat(result.avgScore) || 0
    }

    return categoryScores
  }

  private async getMetricTrends(
    startDate: Date,
    endDate: Date,
  ): Promise<
    Array<{
      date: string
      category: string
      score: number
    }>
  > {
    const results = await this.metricRepository
      .createQueryBuilder("metric")
      .select("DATE(metric.timestamp)", "date")
      .addSelect("metric.metricCategory", "category")
      .addSelect("AVG(metric.value)", "score")
      .where("metric.timestamp >= :startDate", { startDate })
      .andWhere("metric.timestamp <= :endDate", { endDate })
      .groupBy("DATE(metric.timestamp), metric.metricCategory")
      .orderBy("DATE(metric.timestamp)", "ASC")
      .getRawMany()

    return results.map((result) => ({
      date: result.date,
      category: result.category,
      score: Number.parseFloat(result.score) || 0,
    }))
  }

  private getTopCategories(
    categoryScores: Record<string, number>,
    topPerforming: boolean,
  ): Array<{
    category: string
    score: number
  }> {
    const sorted = Object.entries(categoryScores)
      .map(([category, score]) => ({ category, score }))
      .sort((a, b) => (topPerforming ? b.score - a.score : a.score - b.score))

    return sorted.slice(0, 3)
  }

  private async getIssuesByCategory(startDate: Date, endDate: Date): Promise<Record<string, number>> {
    const results = await this.issueRepository
      .createQueryBuilder("issue")
      .select("issue.entityType", "category")
      .addSelect("COUNT(*)", "count")
      .where("issue.createdAt >= :startDate", { startDate })
      .andWhere("issue.createdAt <= :endDate", { endDate })
      .groupBy("issue.entityType")
      .getRawMany()

    const issuesByCategory: Record<string, number> = {}
    for (const result of results) {
      issuesByCategory[result.category] = Number.parseInt(result.count)
    }

    return issuesByCategory
  }

  private async getIssuesByPriority(startDate: Date, endDate: Date): Promise<Record<string, number>> {
    const results = await this.issueRepository
      .createQueryBuilder("issue")
      .select("issue.priority", "priority")
      .addSelect("COUNT(*)", "count")
      .where("issue.createdAt >= :startDate", { startDate })
      .andWhere("issue.createdAt <= :endDate", { endDate })
      .groupBy("issue.priority")
      .getRawMany()

    const issuesByPriority: Record<string, number> = {}
    for (const result of results) {
      issuesByPriority[result.priority] = Number.parseInt(result.count)
    }

    return issuesByPriority
  }

  private generateRecommendations(
    overallScore: number,
    categoryScores: Record<string, number>,
    criticalIssues: number,
  ): {
    immediate: string[]
    shortTerm: string[]
    longTerm: string[]
  } {
    const recommendations = {
      immediate: [],
      shortTerm: [],
      longTerm: [],
    }

    // Immediate recommendations
    if (criticalIssues > 0) {
      recommendations.immediate.push(`Address ${criticalIssues} critical data quality issues immediately`)
    }

    if (overallScore < 70) {
      recommendations.immediate.push("Overall data quality score is below acceptable threshold (70%)")
    }

    // Short-term recommendations
    const underPerformingCategories = Object.entries(categoryScores)
      .filter(([, score]) => score < 80)
      .map(([category]) => category)

    if (underPerformingCategories.length > 0) {
      recommendations.shortTerm.push(`Focus on improving ${underPerformingCategories.join(", ")} categories`)
    }

    recommendations.shortTerm.push("Implement automated data quality monitoring")
    recommendations.shortTerm.push("Establish data quality SLAs and thresholds")

    // Long-term recommendations
    recommendations.longTerm.push("Develop comprehensive data governance framework")
    recommendations.longTerm.push("Implement data quality training for data stewards")
    recommendations.longTerm.push("Establish data quality metrics and KPIs")
    recommendations.longTerm.push("Create data quality dashboard for stakeholders")

    return recommendations
  }

  async getReports(filters: {
    reportType?: ReportType
    status?: ReportStatus
    startDate?: Date
    endDate?: Date
  }): Promise<DataQualityReport[]> {
    const query = this.reportRepository.createQueryBuilder("report")

    if (filters.reportType) {
      query.andWhere("report.reportType = :reportType", { reportType: filters.reportType })
    }

    if (filters.status) {
      query.andWhere("report.status = :status", { status: filters.status })
    }

    if (filters.startDate) {
      query.andWhere("report.createdAt >= :startDate", { startDate: filters.startDate })
    }

    if (filters.endDate) {
      query.andWhere("report.createdAt <= :endDate", { endDate: filters.endDate })
    }

    return query.orderBy("report.createdAt", "DESC").getMany()
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async generateDailyReport(): Promise<void> {
    this.logger.log("Generating daily data quality report")

    try {
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 1)

      await this.generateReport(ReportType.DAILY, startDate, endDate)
      this.logger.log("Daily report generated successfully")
    } catch (error) {
      this.logger.error(`Daily report generation failed: ${error.message}`, error.stack)
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async generateWeeklyReport(): Promise<void> {
    this.logger.log("Generating weekly data quality report")

    try {
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 7)

      await this.generateReport(ReportType.WEEKLY, startDate, endDate)
      this.logger.log("Weekly report generated successfully")
    } catch (error) {
      this.logger.error(`Weekly report generation failed: ${error.message}`, error.stack)
    }
  }

  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async generateMonthlyReport(): Promise<void> {
    this.logger.log("Generating monthly data quality report")

    try {
      const endDate = new Date()
      const startDate = new Date()
      startDate.setMonth(startDate.getMonth() - 1)

      await this.generateReport(ReportType.MONTHLY, startDate, endDate)
      this.logger.log("Monthly report generated successfully")
    } catch (error) {
      this.logger.error(`Monthly report generation failed: ${error.message}`, error.stack)
    }
  }
}
