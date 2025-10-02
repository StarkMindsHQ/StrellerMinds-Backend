export interface MonitoringConfig {
  enableMetrics?: boolean;
  enableHealthChecks?: boolean;
  enableAlerts?: boolean;
  metricsInterval?: number;
  healthCheckInterval?: number;
  alertThresholds?: AlertThresholds;
  logLevel?: LogLevel;
  retentionPeriod?: number;
}

export interface AlertThresholds {
  cpuUsage?: number;
  memoryUsage?: number;
  responseTime?: number;
  errorRate?: number;
  diskUsage?: number;
}

export interface MetricData {
  timestamp: Date;
  metricName: string;
  value: number;
  tags?: Record<string, string>;
  unit?: string;
}

export interface HealthCheckResult {
  service: string;
  status: HealthStatus;
  timestamp: Date;
  responseTime?: number;
  details?: Record<string, any>;
  error?: string;
}

export interface AlertEvent {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  timestamp: Date;
  resolved: boolean;
  metadata?: Record<string, any>;
}

export enum HealthStatus {
  HEALTHY = 'healthy',
  UNHEALTHY = 'unhealthy',
  DEGRADED = 'degraded',
  UNKNOWN = 'unknown',
}

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  VERBOSE = 'verbose',
}

export enum AlertType {
  PERFORMANCE = 'performance',
  ERROR = 'error',
  AVAILABILITY = 'availability',
  RESOURCE = 'resource',
}

export enum AlertSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}
