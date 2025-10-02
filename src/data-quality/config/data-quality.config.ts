import { registerAs } from '@nestjs/config';

export interface DataQualityConfig {
  monitoring: {
    enabled: boolean;
    intervalMinutes: number;
    alertThresholds: {
      critical: number;
      warning: number;
    };
    retentionDays: number;
  };
  validation: {
    enabled: boolean;
    strictMode: boolean;
    batchSize: number;
    timeoutMs: number;
  };
  cleansing: {
    enabled: boolean;
    autoFix: boolean;
    backupOriginal: boolean;
    maxRetries: number;
  };
  governance: {
    enabled: boolean;
    enforceCompliance: boolean;
    auditTrail: boolean;
    dataClassification: boolean;
  };
  reporting: {
    enabled: boolean;
    scheduleDaily: boolean;
    scheduleWeekly: boolean;
    scheduleMonthly: boolean;
    emailNotifications: boolean;
    webhookUrl?: string;
  };
  performance: {
    enableCaching: boolean;
    cacheExpiryMinutes: number;
    maxConcurrentChecks: number;
    enableProfiling: boolean;
  };
}

export default registerAs(
  'dataQuality',
  (): DataQualityConfig => ({
    monitoring: {
      enabled: process.env.DQ_MONITORING_ENABLED === 'true' || true,
      intervalMinutes: parseInt(process.env.DQ_MONITORING_INTERVAL || '5', 10),
      alertThresholds: {
        critical: parseInt(process.env.DQ_CRITICAL_THRESHOLD || '60', 10),
        warning: parseInt(process.env.DQ_WARNING_THRESHOLD || '80', 10),
      },
      retentionDays: parseInt(process.env.DQ_RETENTION_DAYS || '90', 10),
    },
    validation: {
      enabled: process.env.DQ_VALIDATION_ENABLED === 'true' || true,
      strictMode: process.env.DQ_STRICT_MODE === 'true' || false,
      batchSize: parseInt(process.env.DQ_BATCH_SIZE || '1000', 10),
      timeoutMs: parseInt(process.env.DQ_TIMEOUT_MS || '30000', 10),
    },
    cleansing: {
      enabled: process.env.DQ_CLEANSING_ENABLED === 'true' || true,
      autoFix: process.env.DQ_AUTO_FIX === 'true' || false,
      backupOriginal: process.env.DQ_BACKUP_ORIGINAL === 'true' || true,
      maxRetries: parseInt(process.env.DQ_MAX_RETRIES || '3', 10),
    },
    governance: {
      enabled: process.env.DQ_GOVERNANCE_ENABLED === 'true' || true,
      enforceCompliance: process.env.DQ_ENFORCE_COMPLIANCE === 'true' || false,
      auditTrail: process.env.DQ_AUDIT_TRAIL === 'true' || true,
      dataClassification: process.env.DQ_DATA_CLASSIFICATION === 'true' || true,
    },
    reporting: {
      enabled: process.env.DQ_REPORTING_ENABLED === 'true' || true,
      scheduleDaily: process.env.DQ_SCHEDULE_DAILY === 'true' || false,
      scheduleWeekly: process.env.DQ_SCHEDULE_WEEKLY === 'true' || true,
      scheduleMonthly: process.env.DQ_SCHEDULE_MONTHLY === 'true' || true,
      emailNotifications: process.env.DQ_EMAIL_NOTIFICATIONS === 'true' || false,
      webhookUrl: process.env.DQ_WEBHOOK_URL,
    },
    performance: {
      enableCaching: process.env.DQ_ENABLE_CACHING === 'true' || true,
      cacheExpiryMinutes: parseInt(process.env.DQ_CACHE_EXPIRY_MINUTES || '15', 10),
      maxConcurrentChecks: parseInt(process.env.DQ_MAX_CONCURRENT_CHECKS || '10', 10),
      enableProfiling: process.env.DQ_ENABLE_PROFILING === 'true' || false,
    },
  }),
);
