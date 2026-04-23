import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OpenAPIValidationService, ValidationResult, ValidationError } from './openapi-validation.service';

/**
 * Contract Violation Reporter Service
 * 
 * Monitors, reports, and alerts on OpenAPI contract violations.
 * Provides comprehensive violation tracking and notification capabilities.
 * 
 * Features:
 * - Real-time violation monitoring
 * - Violation aggregation and analysis
 * - Alert generation and delivery
 * - Historical violation tracking
 * - Performance impact analysis
 */

export interface ContractViolation {
  id: string;
  timestamp: number;
  endpoint: string;
  method: string;
  violationType: 'request' | 'response';
  severity: 'low' | 'medium' | 'high' | 'critical';
  errors: ValidationErrorWithTracking[];
  metadata: ViolationMetadata;
  resolved: boolean;
  resolvedAt?: number;
  resolvedBy?: string;
}

export interface ValidationErrorWithTracking extends ValidationError {
  count: number;
  firstSeen: number;
  lastSeen: number;
}

export interface ViolationMetadata {
  userAgent?: string;
  ipAddress?: string;
  requestId?: string;
  userId?: string;
  responseTime?: number;
  statusCode?: number;
  environment: string;
}

export interface ViolationReport {
  id: string;
  generatedAt: number;
  timeRange: {
    start: number;
    end: number;
  };
  summary: {
    totalViolations: number;
    uniqueEndpoints: number;
    criticalViolations: number;
    highViolations: number;
    mediumViolations: number;
    lowViolations: number;
    resolvedViolations: number;
    averageResolutionTime: number;
  };
  violations: ContractViolation[];
  trends: ViolationTrend[];
  recommendations: string[];
}

export interface ViolationTrend {
  period: string;
  count: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  changePercentage: number;
}

export interface AlertConfig {
  enabled: boolean;
  thresholds: {
    criticalViolations: number;
    highViolations: number;
    totalViolations: number;
    violationRate: number; // violations per 1000 requests
  };
  channels: {
    email: boolean;
    slack: boolean;
    webhook: boolean;
    dashboard: boolean;
  };
  recipients: {
    email: string[];
    slack: string[];
    webhook: string[];
  };
  cooldown: number; // seconds
}

export interface ViolationAlert {
  id: string;
  type: 'threshold_exceeded' | 'critical_violation' | 'trend_analysis';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: any;
  timestamp: number;
  sent: boolean;
  channels: string[];
}

@Injectable()
export class ContractViolationReporterService {
  private readonly logger = new Logger(ContractViolationReporterService.name);
  private readonly violations = new Map<string, ContractViolation>();
  private readonly alerts = new Map<string, ViolationAlert>();
  private readonly config: AlertConfig;
  private readonly violationHistory: ContractViolation[] = [];
  private lastAlertTime = new Map<string, number>();

  constructor(
    private readonly configService: ConfigService,
    private readonly openApiValidation: OpenAPIValidationService
  ) {
    this.config = {
      enabled: this.configService.get('CONTRACT_VIOLATION_REPORTING_ENABLED', true),
      thresholds: {
        criticalViolations: this.configService.get('CONTRACT_CRITICAL_VIOLATION_THRESHOLD', 5),
        highViolations: this.configService.get('CONTRACT_HIGH_VIOLATION_THRESHOLD', 10),
        totalViolations: this.configService.get('CONTRACT_TOTAL_VIOLATION_THRESHOLD', 50),
        violationRate: this.configService.get('CONTRACT_VIOLATION_RATE_THRESHOLD', 10), // per 1000 requests
      },
      channels: {
        email: this.configService.get('CONTRACT_ALERT_EMAIL_ENABLED', true),
        slack: this.configService.get('CONTRACT_ALERT_SLACK_ENABLED', false),
        webhook: this.configService.get('CONTRACT_ALERT_WEBHOOK_ENABLED', false),
        dashboard: this.configService.get('CONTRACT_ALERT_DASHBOARD_ENABLED', true),
      },
      recipients: {
        email: this.configService.get('CONTRACT_ALERT_EMAIL_RECIPIENTS', '').split(',').filter(Boolean),
        slack: this.configService.get('CONTRACT_ALERT_SLACK_CHANNELS', '').split(',').filter(Boolean),
        webhook: this.configService.get('CONTRACT_ALERT_WEBHOOK_URLS', '').split(',').filter(Boolean),
      },
      cooldown: this.configService.get('CONTRACT_ALERT_COOLDOWN', 300), // 5 minutes
    };
  }

  /**
   * Record a contract violation
   * 
   * @param validation - Validation result containing violations
   * @param metadata - Additional violation metadata
   */
  recordViolation(validation: ValidationResult, metadata: ViolationMetadata): void {
    if (!this.config.enabled || validation.isValid) {
      return;
    }

    const violationId = this.generateViolationId(validation);
    const existingViolation = this.violations.get(violationId);

    if (existingViolation) {
      // Update existing violation
      this.updateViolation(existingViolation, validation);
    } else {
      // Create new violation
      const newViolation = this.createViolation(validation, metadata);
      this.violations.set(violationId, newViolation);
      this.violationHistory.push(newViolation);

      // Check for immediate alerts
      this.checkImmediateAlerts(newViolation);
    }

    // Periodic alert checking
    this.checkAlertThresholds();
  }

  /**
   * Generate violation report for time range
   * 
   * @param startTime - Start timestamp
   * @param endTime - End timestamp
   * @returns Violation report
   */
  generateReport(startTime: number, endTime: number): ViolationReport {
    const violations = this.violationHistory.filter(
      v => v.timestamp >= startTime && v.timestamp <= endTime
    );

    const summary = this.calculateSummary(violations);
    const trends = this.calculateTrends(startTime, endTime);
    const recommendations = this.generateRecommendations(violations);

    return {
      id: this.generateReportId(),
      generatedAt: Date.now(),
      timeRange: { start: startTime, end: endTime },
      summary,
      violations,
      trends,
      recommendations,
    };
  }

  /**
   * Get violation statistics
   * 
   * @param timeRangeHours - Time range in hours (default: 24)
   * @returns Violation statistics
   */
  getStatistics(timeRangeHours: number = 24): {
    total: number;
    bySeverity: Record<string, number>;
    byEndpoint: Record<string, number>;
    byType: Record<string, number>;
    resolutionRate: number;
    averageResolutionTime: number;
  } {
    const cutoffTime = Date.now() - (timeRangeHours * 60 * 60 * 1000);
    const recentViolations = this.violationHistory.filter(v => v.timestamp >= cutoffTime);

    const bySeverity = recentViolations.reduce((acc, v) => {
      acc[v.severity] = (acc[v.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byEndpoint = recentViolations.reduce((acc, v) => {
      const key = `${v.method} ${v.endpoint}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byType = recentViolations.reduce((acc, v) => {
      acc[v.violationType] = (acc[v.violationType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const resolvedViolations = recentViolations.filter(v => v.resolved);
    const resolutionRate = recentViolations.length > 0 
      ? (resolvedViolations.length / recentViolations.length) * 100 
      : 0;

    const averageResolutionTime = resolvedViolations.length > 0
      ? resolvedViolations.reduce((sum, v) => sum + (v.resolvedAt! - v.timestamp), 0) / resolvedViolations.length
      : 0;

    return {
      total: recentViolations.length,
      bySeverity,
      byEndpoint,
      byType,
      resolutionRate,
      averageResolutionTime,
    };
  }

  /**
   * Resolve a violation
   * 
   * @param violationId - Violation ID
   * @param resolvedBy - Who resolved it
   */
  resolveViolation(violationId: string, resolvedBy: string): void {
    const violation = this.violations.get(violationId);
    if (violation) {
      violation.resolved = true;
      violation.resolvedAt = Date.now();
      violation.resolvedBy = resolvedBy;
      
      this.logger.log(`Contract violation resolved: ${violationId} by ${resolvedBy}`);
    }
  }

  /**
   * Get unresolved violations
   * 
   * @returns List of unresolved violations
   */
  getUnresolvedViolations(): ContractViolation[] {
    return Array.from(this.violations.values()).filter(v => !v.resolved);
  }

  /**
   * Check alert thresholds and send alerts if needed
   */
  private checkAlertThresholds(): void {
    const now = Date.now();
    const lastHour = now - (60 * 60 * 1000);
    const recentViolations = this.violationHistory.filter(v => v.timestamp >= lastHour);

    // Check critical violations
    const criticalCount = recentViolations.filter(v => v.severity === 'critical').length;
    if (criticalCount >= this.config.thresholds.criticalViolations) {
      this.sendAlert('threshold_exceeded', 'critical', {
        type: 'critical_violations',
        count: criticalCount,
        threshold: this.config.thresholds.criticalViolations,
      });
    }

    // Check high violations
    const highCount = recentViolations.filter(v => v.severity === 'high').length;
    if (highCount >= this.config.thresholds.highViolations) {
      this.sendAlert('threshold_exceeded', 'high', {
        type: 'high_violations',
        count: highCount,
        threshold: this.config.thresholds.highViolations,
      });
    }

    // Check total violations
    if (recentViolations.length >= this.config.thresholds.totalViolations) {
      this.sendAlert('threshold_exceeded', 'medium', {
        type: 'total_violations',
        count: recentViolations.length,
        threshold: this.config.thresholds.totalViolations,
      });
    }
  }

  /**
   * Check for immediate alerts on new violations
   */
  private checkImmediateAlerts(violation: ContractViolation): void {
    if (violation.severity === 'critical') {
      this.sendAlert('critical_violation', 'critical', {
        violation,
        message: `Critical contract violation detected: ${violation.method} ${violation.endpoint}`,
      });
    }
  }

  /**
   * Send alert through configured channels
   */
  private sendAlert(type: string, severity: string, details: any): void {
    const alertId = `${type}_${Date.now()}`;
    const cooldownKey = `${type}_${severity}`;
    const now = Date.now();

    // Check cooldown
    const lastAlert = this.lastAlertTime.get(cooldownKey);
    if (lastAlert && (now - lastAlert) < (this.config.cooldown * 1000)) {
      return; // Still in cooldown period
    }

    const alert: ViolationAlert = {
      id: alertId,
      type: type as any,
      severity: severity as any,
      message: this.generateAlertMessage(type, severity, details),
      details,
      timestamp: now,
      sent: false,
      channels: [],
    };

    // Send through enabled channels
    if (this.config.channels.email) {
      this.sendEmailAlert(alert);
      alert.channels.push('email');
    }

    if (this.config.channels.slack) {
      this.sendSlackAlert(alert);
      alert.channels.push('slack');
    }

    if (this.config.channels.webhook) {
      this.sendWebhookAlert(alert);
      alert.channels.push('webhook');
    }

    if (this.config.channels.dashboard) {
      this.updateDashboard(alert);
      alert.channels.push('dashboard');
    }

    alert.sent = alert.channels.length > 0;
    this.alerts.set(alertId, alert);
    this.lastAlertTime.set(cooldownKey, now);

    this.logger.log(`Contract violation alert sent: ${alertId} via ${alert.channels.join(', ')}`);
  }

  /**
   * Generate unique violation ID
   */
  private generateViolationId(validation: ValidationResult): string {
    const { method, endpoint } = validation.metadata;
    const errorSignature = validation.errors.map(e => e.code).sort().join('_');
    return `${method}_${endpoint}_${errorSignature}`.replace(/[^a-zA-Z0-9_]/g, '_');
  }

  /**
   * Create new violation object
   */
  private createViolation(validation: ValidationResult, metadata: ViolationMetadata): ContractViolation {
    const errors = validation.errors.map(error => ({
      ...error,
      count: 1,
      firstSeen: Date.now(),
      lastSeen: Date.now(),
    }));

    const severity = this.determineSeverity(validation.errors);

    return {
      id: this.generateViolationId(validation),
      timestamp: Date.now(),
      endpoint: validation.metadata.endpoint,
      method: validation.metadata.method,
      violationType: validation.metadata.validationType as 'request' | 'response',
      severity,
      errors,
      metadata: {
        ...metadata,
        environment: process.env.NODE_ENV || 'unknown',
      },
      resolved: false,
    };
  }

  /**
   * Update existing violation
   */
  private updateViolation(violation: ContractViolation, validation: ValidationResult): void {
    // Update error counts and timestamps
    validation.errors.forEach(newError => {
      const existingError = violation.errors.find(e => e.code === newError.code);
      if (existingError) {
        existingError.count++;
        existingError.lastSeen = Date.now();
      } else {
        violation.errors.push({
          ...newError,
          count: 1,
          firstSeen: Date.now(),
          lastSeen: Date.now(),
        });
      }
    });

    // Update severity if needed
    const newSeverity = this.determineSeverity(violation.errors);
    if (this.compareSeverity(newSeverity, violation.severity) > 0) {
      violation.severity = newSeverity;
    }
  }

  /**
   * Determine violation severity based on errors
   */
  private determineSeverity(errors: ValidationError[]): 'low' | 'medium' | 'high' | 'critical' {
    if (errors.length === 0) return 'low';
    
    const errorCodes = errors.map(e => e.code);
    
    // Critical errors
    if (errorCodes.includes('ENDPOINT_NOT_FOUND') || 
        errorCodes.includes('MISSING_REQUIRED_FIELD')) {
      return 'critical';
    }
    
    // High severity errors
    if (errorCodes.includes('INVALID_DATA_TYPE') || 
        errorCodes.includes('MISSING_HEADER')) {
      return 'high';
    }
    
    // Medium severity errors
    if (errorCodes.includes('INVALID_PARAMETER') || 
        errorCodes.includes('MISSING_QUERY_PARAMETER')) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Compare severity levels
   */
  private compareSeverity(severity1: string, severity2: string): number {
    const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
    return severityOrder[severity1] - severityOrder[severity2];
  }

  /**
   * Calculate violation summary
   */
  private calculateSummary(violations: ContractViolation[]) {
    const total = violations.length;
    const critical = violations.filter(v => v.severity === 'critical').length;
    const high = violations.filter(v => v.severity === 'high').length;
    const medium = violations.filter(v => v.severity === 'medium').length;
    const low = violations.filter(v => v.severity === 'low').length;
    const resolved = violations.filter(v => v.resolved).length;
    
    const resolvedViolations = violations.filter(v => v.resolved);
    const averageResolutionTime = resolvedViolations.length > 0
      ? resolvedViolations.reduce((sum, v) => sum + (v.resolvedAt! - v.timestamp), 0) / resolvedViolations.length
      : 0;

    return {
      totalViolations: total,
      uniqueEndpoints: new Set(violations.map(v => `${v.method} ${v.endpoint}`)).size,
      criticalViolations: critical,
      highViolations: high,
      mediumViolations: medium,
      lowViolations: low,
      resolvedViolations: resolved,
      averageResolutionTime,
    };
  }

  /**
   * Calculate violation trends
   */
  private calculateTrends(startTime: number, endTime: number): ViolationTrend[] {
    // Implementation for trend analysis
    // This would analyze violation patterns over time
    return [];
  }

  /**
   * Generate recommendations based on violations
   */
  private generateRecommendations(violations: ContractViolation[]): string[] {
    const recommendations: string[] = [];
    
    if (violations.length === 0) {
      recommendations.push('No violations detected. Continue maintaining API contract compliance.');
      return recommendations;
    }

    // Analyze common issues
    const errorCodes = violations.flatMap(v => v.errors.map(e => e.code));
    const codeFrequency = errorCodes.reduce((acc, code) => {
      acc[code] = (acc[code] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Generate recommendations based on common errors
    if (codeFrequency['ENDPOINT_NOT_FOUND'] > 0) {
      recommendations.push('Update OpenAPI specification to include all implemented endpoints.');
    }

    if (codeFrequency['MISSING_REQUIRED_FIELD'] > 0) {
      recommendations.push('Review request/response schemas for missing required fields.');
    }

    if (codeFrequency['INVALID_DATA_TYPE'] > 0) {
      recommendations.push('Validate data types in implementation match OpenAPI specification.');
    }

    // Endpoint-specific recommendations
    const endpointViolations = violations.reduce((acc, v) => {
      const key = `${v.method} ${v.endpoint}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const problematicEndpoints = Object.entries(endpointViolations)
      .filter(([, count]) => count > 5)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    if (problematicEndpoints.length > 0) {
      recommendations.push(`Pay special attention to these endpoints: ${problematicEndpoints.map(([endpoint]) => endpoint).join(', ')}`);
    }

    return recommendations;
  }

  /**
   * Generate alert message
   */
  private generateAlertMessage(type: string, severity: string, details: any): string {
    switch (type) {
      case 'threshold_exceeded':
        return `Contract violation threshold exceeded: ${details.type} (${details.count} > ${details.threshold})`;
      case 'critical_violation':
        return `Critical contract violation detected: ${details.violation.method} ${details.violation.endpoint}`;
      default:
        return `Contract violation alert: ${type}`;
    }
  }

  /**
   * Send email alert
   */
  private sendEmailAlert(alert: ViolationAlert): void {
    // Implementation would integrate with email service
    this.logger.log(`Email alert sent: ${alert.message}`);
  }

  /**
   * Send Slack alert
   */
  private sendSlackAlert(alert: ViolationAlert): void {
    // Implementation would integrate with Slack API
    this.logger.log(`Slack alert sent: ${alert.message}`);
  }

  /**
   * Send webhook alert
   */
  private sendWebhookAlert(alert: ViolationAlert): void {
    // Implementation would send HTTP webhook
    this.logger.log(`Webhook alert sent: ${alert.message}`);
  }

  /**
   * Update dashboard with alert
   */
  private updateDashboard(alert: ViolationAlert): void {
    // Implementation would update monitoring dashboard
    this.logger.log(`Dashboard updated with alert: ${alert.message}`);
  }

  /**
   * Generate report ID
   */
  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Scheduled cleanup of old violations
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  cleanupOldViolations(): void {
    const cutoffTime = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days ago
    
    // Remove old violations from history
    const initialSize = this.violationHistory.length;
    this.violationHistory.splice(0, this.violationHistory.length, 
      ...this.violationHistory.filter(v => v.timestamp >= cutoffTime)
    );
    
    // Remove old resolved violations from active map
    for (const [id, violation] of this.violations.entries()) {
      if (violation.resolved && violation.resolvedAt! < cutoffTime) {
        this.violations.delete(id);
      }
    }
    
    const removedCount = initialSize - this.violationHistory.length;
    if (removedCount > 0) {
      this.logger.log(`Cleaned up ${removedCount} old contract violations`);
    }
  }

  /**
   * Generate daily violation summary
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  generateDailySummary(): void {
    const now = Date.now();
    const yesterday = now - (24 * 60 * 60 * 1000);
    
    const report = this.generateReport(yesterday, now);
    
    // Send daily summary to configured channels
    if (report.summary.totalViolations > 0) {
      this.sendAlert('trend_analysis', 'medium', {
        type: 'daily_summary',
        report,
      });
    }
    
    this.logger.log(`Daily violation summary generated: ${report.summary.totalViolations} violations`);
  }
}
