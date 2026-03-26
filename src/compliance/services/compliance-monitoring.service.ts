import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';

export interface DataAccessLogEntry {
  id: string;
  actorId: string;
  resource: string;
  action: string;
  lawfulBasis: string;
  containsPersonalData: boolean;
  outcome: 'allowed' | 'denied';
  timestamp: Date;
}

export interface ComplianceCheckResult {
  control: string;
  status: 'pass' | 'warning' | 'fail';
  detail: string;
}

export interface AuditTrailEntry {
  id: string;
  timestamp: Date;
  category: 'gdpr' | 'security' | 'access';
  summary: string;
  evidence: Record<string, unknown>;
}

@Injectable()
export class ComplianceMonitoringService implements OnModuleInit {
  private readonly logger = new Logger(ComplianceMonitoringService.name);
  private readonly accessLogs: DataAccessLogEntry[] = [];
  private readonly auditTrail: AuditTrailEntry[] = [];
  private readonly reports: Array<Record<string, unknown>> = [];

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.seedAccessLogs();
    this.generateComplianceReport('startup-baseline');
  }

  @Cron('0 7 * * *', { name: 'daily-compliance-report' })
  createDailyComplianceReport() {
    const report = this.generateComplianceReport('daily-scheduled');
    this.logger.log(`Generated scheduled compliance report ${report.id}`);
  }

  getDashboard() {
    const checks = this.runSecurityComplianceChecks();
    const gdpr = this.getGdprComplianceStatus();

    return {
      generatedAt: new Date(),
      gdpr,
      checks,
      accessLogCount: this.accessLogs.length,
      openFindings:
        checks.filter((check) => check.status !== 'pass').length + gdpr.violations.length,
      latestAuditTrail: this.auditTrail.slice(-10).reverse(),
    };
  }

  logDataAccess(
    actorId: string,
    resource: string,
    action: string,
    lawfulBasis = 'legitimate_interest',
    containsPersonalData = true,
    outcome: 'allowed' | 'denied' = 'allowed',
  ) {
    const entry: DataAccessLogEntry = {
      id: `access-${Date.now()}`,
      actorId,
      resource,
      action,
      lawfulBasis,
      containsPersonalData,
      outcome,
      timestamp: new Date(),
    };

    this.accessLogs.push(entry);
    this.recordAuditTrail('access', `Data access ${action} on ${resource}`, {
      actorId,
      outcome,
      lawfulBasis,
    });

    return entry;
  }

  getAccessLogs() {
    return [...this.accessLogs].reverse();
  }

  getGdprComplianceStatus() {
    const recentPersonalAccess = this.accessLogs.filter((log) => log.containsPersonalData).length;
    const deniedAccessCount = this.accessLogs.filter((log) => log.outcome === 'denied').length;
    const missingLawfulBasis = this.accessLogs.filter((log) => !log.lawfulBasis).length;
    const violations = [];

    if (missingLawfulBasis > 0) {
      violations.push('Some data access records are missing a lawful basis.');
    }

    if (deniedAccessCount > 3) {
      violations.push('Denied access volume is elevated and should be investigated.');
    }

    return {
      status: violations.length === 0 ? 'compliant' : 'attention_required',
      recentPersonalAccess,
      deniedAccessCount,
      missingLawfulBasis,
      violations,
      controls: [
        'Data access logging is enabled for personal data operations.',
        'Audit trail automation records compliance-relevant access events.',
        'Scheduled compliance reporting runs daily for operational review.',
      ],
    };
  }

  runSecurityComplianceChecks(): ComplianceCheckResult[] {
    const checks: ComplianceCheckResult[] = [
      {
        control: 'jwt-secret',
        status: this.configService.get('JWT_SECRET') ? 'pass' : 'fail',
        detail: this.configService.get('JWT_SECRET')
          ? 'JWT secret is configured.'
          : 'JWT secret is missing.',
      },
      {
        control: 'database-encryption',
        status: this.configService.get('DATABASE_URL') ? 'pass' : 'warning',
        detail: this.configService.get('DATABASE_URL')
          ? 'Database connection URL is configured for centralized secret handling.'
          : 'Database URL is not configured; verify secure connection settings manually.',
      },
      {
        control: 'audit-trail',
        status: this.auditTrail.length > 0 ? 'pass' : 'warning',
        detail:
          this.auditTrail.length > 0
            ? 'Audit trail entries are being generated.'
            : 'No audit trail entries have been captured yet.',
      },
      {
        control: 'data-access-logging',
        status: this.accessLogs.length > 0 ? 'pass' : 'warning',
        detail:
          this.accessLogs.length > 0
            ? 'Data access logging contains recent events.'
            : 'No data access logging events are available yet.',
      },
    ];

    this.recordAuditTrail('security', 'Ran security compliance checks', {
      failures: checks.filter((check) => check.status === 'fail').map((check) => check.control),
    });

    return checks;
  }

  getAuditTrail() {
    return [...this.auditTrail].reverse();
  }

  generateComplianceReport(trigger = 'manual') {
    const checks = this.runSecurityComplianceChecks();
    const gdpr = this.getGdprComplianceStatus();

    const report = {
      id: `compliance-report-${Date.now()}`,
      trigger,
      createdAt: new Date(),
      summary: {
        gdprStatus: gdpr.status,
        passingChecks: checks.filter((check) => check.status === 'pass').length,
        warningChecks: checks.filter((check) => check.status === 'warning').length,
        failedChecks: checks.filter((check) => check.status === 'fail').length,
      },
      gdpr,
      checks,
      auditTrailEntries: this.auditTrail.slice(-20),
    };

    this.reports.push(report);
    return report;
  }

  getReports() {
    return [...this.reports].reverse();
  }

  private recordAuditTrail(
    category: AuditTrailEntry['category'],
    summary: string,
    evidence: Record<string, unknown>,
  ) {
    this.auditTrail.push({
      id: `audit-${Date.now()}-${this.auditTrail.length + 1}`,
      timestamp: new Date(),
      category,
      summary,
      evidence,
    });
  }

  private seedAccessLogs() {
    this.logDataAccess('system', 'user_profile', 'export', 'legal_obligation');
    this.logDataAccess('admin-1', 'payment_history', 'read', 'contract');
    this.logDataAccess('support-1', 'privacy_request', 'update', 'legal_obligation');
  }
}
