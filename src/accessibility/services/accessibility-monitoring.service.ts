import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { AccessibilityAudit, AuditStatus, AuditType } from '../entities/accessibility-audit.entity';
import { AccessibilityViolation } from '../entities/accessibility-violation.entity';
import {
  AccessibilityTestingService,
  AccessibilityAuditResult,
  ViolationSeverity,
} from './accessibility-testing.service';

@Injectable()
export class AccessibilityMonitoringService {
  private readonly logger = new Logger(AccessibilityMonitoringService.name);

  constructor(
    @InjectRepository(AccessibilityAudit)
    private auditRepository: Repository<AccessibilityAudit>,
    @InjectRepository(AccessibilityViolation)
    private violationRepository: Repository<AccessibilityViolation>,
    private testingService: AccessibilityTestingService,
  ) {}

  /**
   * Save audit results to database
   */
  async saveAudit(
    url: string,
    auditResults: AccessibilityAuditResult[],
    userId?: string,
    type: AuditType = AuditType.FULL_AUDIT,
  ): Promise<AccessibilityAudit> {
    const critical = auditResults.filter((r) => r.severity === ViolationSeverity.CRITICAL).length;
    const serious = auditResults.filter((r) => r.severity === ViolationSeverity.SERIOUS).length;
    const moderate = auditResults.filter((r) => r.severity === ViolationSeverity.MODERATE).length;
    const minor = auditResults.filter((r) => r.severity === ViolationSeverity.MINOR).length;
    const total = auditResults.length;

    const meetsWCAG = this.testingService.meetsWCAG21AA(auditResults);
    const score = this.calculateAccessibilityScore(auditResults);

    let status: AuditStatus;
    if (critical > 0 || serious > 0) {
      status = AuditStatus.FAILED;
    } else if (moderate > 0 || minor > 0) {
      status = AuditStatus.WARNING;
    } else {
      status = AuditStatus.PASSED;
    }

    const audit = this.auditRepository.create({
      url,
      userId,
      type,
      status,
      totalIssues: total,
      criticalIssues: critical,
      seriousIssues: serious,
      moderateIssues: moderate,
      minorIssues: minor,
      accessibilityScore: score,
      wcag21AACompliant: meetsWCAG,
      auditResults: auditResults,
      recommendations: this.extractRecommendations(auditResults),
    });

    const savedAudit = await this.auditRepository.save(audit);

    // Save violations separately
    const violations = auditResults.map((result) =>
      this.violationRepository.create({
        auditId: savedAudit.id,
        type: result.type,
        severity: result.severity,
        description: result.description,
        wcagCriteria: result.wcagCriteria,
        recommendation: result.recommendation,
        element: result.element,
        selector: result.selector,
        metadata: {
          id: result.id,
        },
      }),
    );

    await this.violationRepository.save(violations);

    this.logger.log(`Accessibility audit saved: ${savedAudit.id} for ${url}`);

    return savedAudit;
  }

  /**
   * Get audit history
   */
  async getAuditHistory(
    userId?: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 50,
  ): Promise<AccessibilityAudit[]> {
    const where: any = {};
    if (userId) where.userId = userId;
    if (startDate && endDate) {
      where.createdAt = Between(startDate, endDate);
    }

    return this.auditRepository.find({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['violations'],
    });
  }

  /**
   * Get audit statistics
   */
  async getAuditStatistics(userId?: string, days: number = 30): Promise<{
    totalAudits: number;
    passedAudits: number;
    failedAudits: number;
    warningAudits: number;
    averageScore: number;
    wcagComplianceRate: number;
    issuesBySeverity: Record<string, number>;
    trends: Array<{ date: string; score: number; issues: number }>;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const where: any = { createdAt: Between(startDate, new Date()) };
    if (userId) where.userId = userId;

    const audits = await this.auditRepository.find({
      where,
      order: { createdAt: 'ASC' },
    });

    const totalAudits = audits.length;
    const passedAudits = audits.filter((a) => a.status === AuditStatus.PASSED).length;
    const failedAudits = audits.filter((a) => a.status === AuditStatus.FAILED).length;
    const warningAudits = audits.filter((a) => a.status === AuditStatus.WARNING).length;
    const wcagCompliant = audits.filter((a) => a.wcag21AACompliant).length;

    const scores = audits.filter((a) => a.accessibilityScore !== null).map((a) => a.accessibilityScore!);
    const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    const issuesBySeverity = {
      critical: audits.reduce((sum, a) => sum + a.criticalIssues, 0),
      serious: audits.reduce((sum, a) => sum + a.seriousIssues, 0),
      moderate: audits.reduce((sum, a) => sum + a.moderateIssues, 0),
      minor: audits.reduce((sum, a) => sum + a.minorIssues, 0),
    };

    // Group by date for trends
    const trendsMap = new Map<string, { score: number; issues: number; count: number }>();
    audits.forEach((audit) => {
      const date = audit.createdAt.toISOString().split('T')[0];
      const existing = trendsMap.get(date) || { score: 0, issues: 0, count: 0 };
      existing.score += audit.accessibilityScore || 0;
      existing.issues += audit.totalIssues;
      existing.count += 1;
      trendsMap.set(date, existing);
    });

    const trends = Array.from(trendsMap.entries())
      .map(([date, data]) => ({
        date,
        score: Math.round((data.score / data.count) * 100) / 100,
        issues: data.issues,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalAudits,
      passedAudits,
      failedAudits,
      warningAudits,
      averageScore: Math.round(averageScore * 100) / 100,
      wcagComplianceRate: totalAudits > 0 ? (wcagCompliant / totalAudits) * 100 : 0,
      issuesBySeverity,
      trends,
    };
  }

  /**
   * Get audit by ID
   */
  async getAuditById(id: string): Promise<AccessibilityAudit | null> {
    return this.auditRepository.findOne({
      where: { id },
      relations: ['violations', 'user'],
    });
  }

  /**
   * Calculate accessibility score (0-100)
   */
  private calculateAccessibilityScore(results: AccessibilityAuditResult[]): number {
    if (results.length === 0) return 100;

    const weights = {
      [ViolationSeverity.CRITICAL]: 20,
      [ViolationSeverity.SERIOUS]: 10,
      [ViolationSeverity.MODERATE]: 5,
      [ViolationSeverity.MINOR]: 2,
    };

    let totalDeduction = 0;
    results.forEach((result) => {
      totalDeduction += weights[result.severity] || 0;
    });

    return Math.max(0, 100 - totalDeduction);
  }

  /**
   * Extract unique recommendations
   */
  private extractRecommendations(results: AccessibilityAuditResult[]): string[] {
    const recommendations = new Set<string>();
    results.forEach((result) => {
      if (result.recommendation) {
        recommendations.add(result.recommendation);
      }
    });
    return Array.from(recommendations);
  }
}
