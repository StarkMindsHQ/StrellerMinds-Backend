import { Injectable, Logger } from '@nestjs/common';
import { AlertEvent, AlertType, AlertSeverity, AlertThresholds, MonitoringConfig } from '../interfaces/monitoring-config.interface';
import { MetricsCollectorService } from './metrics-collector.service';
import { HealthCheckService } from './health-check.service';

@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);
  private alerts: AlertEvent[] = [];
  private alertHandlers = new Map<AlertType, (alert: AlertEvent) => Promise<void>>();

  constructor(
    private readonly config: MonitoringConfig,
    private readonly metricsCollector: MetricsCollectorService,
    private readonly healthCheckService: HealthCheckService
  ) {
    this.setupDefaultAlertHandlers();
  }

  private setupDefaultAlertHandlers(): void {
    // Default console alert handler
    this.alertHandlers.set(AlertType.PERFORMANCE, async (alert) => {
      this.logger.warn(`Performance Alert: ${alert.message}`, alert.metadata);
    });

    this.alertHandlers.set(AlertType.ERROR, async (alert) => {
      this.logger.error(`Error Alert: ${alert.message}`, alert.metadata);
    });

    this.alertHandlers.set(AlertType.AVAILABILITY, async (alert) => {
      this.logger.error(`Availability Alert: ${alert.message}`, alert.metadata);
    });

    this.alertHandlers.set(AlertType.RESOURCE, async (alert) => {
      this.logger.warn(`Resource Alert: ${alert.message}`, alert.metadata);
    });
  }

  async checkAlertConditions(): Promise<void> {
    if (!this.config.enableAlerts || !this.config.alertThresholds) return;

    try {
      await this.checkPerformanceAlerts();
      await this.checkResourceAlerts();
      await this.checkAvailabilityAlerts();
    } catch (error) {
      this.logger.error('Failed to check alert conditions', error.stack);
    }
  }

  private async checkPerformanceAlerts(): Promise<void> {
    const thresholds = this.config.alertThresholds;
    
    // Check response time
    if (thresholds.responseTime) {
      const responseTimeMetrics = this.metricsCollector.getMetricsByName('response_time_avg');
      const latestMetric = responseTimeMetrics[responseTimeMetrics.length - 1];
      
      if (latestMetric && latestMetric.value > thresholds.responseTime) {
        await this.createAlert({
          type: AlertType.PERFORMANCE,
          severity: AlertSeverity.HIGH,
          message: `Response time exceeded threshold: ${latestMetric.value}ms > ${thresholds.responseTime}ms`,
          metadata: {
            currentValue: latestMetric.value,
            threshold: thresholds.responseTime,
            metric: 'response_time'
          }
        });
      }
    }

    // Check error rate
    if (thresholds.errorRate) {
      const errorRateMetrics = this.metricsCollector.getMetricsByName('error_rate');
      const latestMetric = errorRateMetrics[errorRateMetrics.length - 1];
      
      if (latestMetric && latestMetric.value > thresholds.errorRate) {
        await this.createAlert({
          type: AlertType.ERROR,
          severity: AlertSeverity.CRITICAL,
          message: `Error rate exceeded threshold: ${latestMetric.value}% > ${thresholds.errorRate}%`,
          metadata: {
            currentValue: latestMetric.value,
            threshold: thresholds.errorRate,
            metric: 'error_rate'
          }
        });
      }
    }
  }

  private async checkResourceAlerts(): Promise<void> {
    const thresholds = this.config.alertThresholds;
    
    // Check CPU usage
    if (thresholds.cpuUsage) {
      const cpuMetrics = this.metricsCollector.getMetricsByName('cpu_usage');
      const latestMetric = cpuMetrics[cpuMetrics.length - 1];
      
      if (latestMetric && latestMetric.value > thresholds.cpuUsage) {
        await this.createAlert({
          type: AlertType.RESOURCE,
          severity: AlertSeverity.HIGH,
          message: `CPU usage exceeded threshold: ${latestMetric.value}% > ${thresholds.cpuUsage}%`,
          metadata: {
            currentValue: latestMetric.value,
            threshold: thresholds.cpuUsage,
            metric: 'cpu_usage'
          }
        });
      }
    }

    // Check memory usage
    if (thresholds.memoryUsage) {
      const memoryMetrics = this.metricsCollector.getMetricsByName('memory_usage');
      const latestMetric = memoryMetrics[memoryMetrics.length - 1];
      
      if (latestMetric && latestMetric.value > thresholds.memoryUsage) {
        await this.createAlert({
          type: AlertType.RESOURCE,
          severity: AlertSeverity.HIGH,
          message: `Memory usage exceeded threshold: ${latestMetric.value}% > ${thresholds.memoryUsage}%`,
          metadata: {
            currentValue: latestMetric.value,
            threshold: thresholds.memoryUsage,
            metric: 'memory_usage'
          }
        });
      }
    }
  }

  private async checkAvailabilityAlerts(): Promise<void> {
    const healthStatus = this.healthCheckService.getOverallHealth();
    
    if (healthStatus.status === 'unhealthy') {
      const unhealthyServices = healthStatus.services.filter(s => s.status === 'unhealthy');
      
      await this.createAlert({
        type: AlertType.AVAILABILITY,
        severity: AlertSeverity.CRITICAL,
        message: `Services are unhealthy: ${unhealthyServices.map(s => s.service).join(', ')}`,
        metadata: {
          unhealthyServices: unhealthyServices.map(s => ({
            service: s.service,
            error: s.error
          }))
        }
      });
    }
  }

  private async createAlert(alertData: Omit<AlertEvent, 'id' | 'timestamp' | 'resolved'>): Promise<void> {
    const alert: AlertEvent = {
      id: this.generateAlertId(),
      timestamp: new Date(),
      resolved: false,
      ...alertData
    };

    // Check if similar alert already exists and is not resolved
    const existingAlert = this.alerts.find(a => 
      !a.resolved && 
      a.type === alert.type && 
      a.message === alert.message
    );

    if (existingAlert) {
      this.logger.debug(`Similar alert already exists: ${alert.id}`);
      return;
    }

    this.alerts.push(alert);
    
    // Execute alert handler
    const handler = this.alertHandlers.get(alert.type);
    if (handler) {
      await handler(alert);
    }

    this.logger.log(`Alert created: ${alert.id} - ${alert.message}`);
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public methods
  registerAlertHandler(type: AlertType, handler: (alert: AlertEvent) => Promise<void>): void {
    this.alertHandlers.set(type, handler);
    this.logger.log(`Registered alert handler for type: ${type}`);
  }

  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      this.logger.log(`Alert resolved: ${alertId}`);
      return true;
    }
    return false;
  }

  getAlerts(resolved?: boolean): AlertEvent[] {
    if (resolved === undefined) return [...this.alerts];
    return this.alerts.filter(a => a.resolved === resolved);
  }

  getAlertsByType(type: AlertType, resolved?: boolean): AlertEvent[] {
    return this.getAlerts(resolved).filter(a => a.type === type);
  }

  getAlertsBySeverity(severity: AlertSeverity, resolved?: boolean): AlertEvent[] {
    return this.getAlerts(resolved).filter(a => a.severity === severity);
  }

  clearResolvedAlerts(): number {
    const resolvedCount = this.alerts.filter(a => a.resolved).length;
    this.alerts = this.alerts.filter(a => !a.resolved);
    this.logger.log(`Cleared ${resolvedCount} resolved alerts`);
    return resolvedCount;
  }
}
