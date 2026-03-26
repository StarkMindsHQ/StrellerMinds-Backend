import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';

/**
 * Integration Monitoring Service
 *
 * Provides comprehensive monitoring for external service integrations.
 * Tracks performance, availability, and health metrics.
 *
 * Business Rules:
 * 1. Monitor all external service integrations
 * 2. Track response times and success rates
 * 3. Alert on performance degradation
 * 4. Maintain historical metrics
 * 5. Provide health dashboards
 *
 * Monitoring Features:
 * - Real-time performance metrics
 * - Success rate tracking
 * - Error pattern analysis
 * - Latency monitoring
 * - Availability checks
 */

export interface IntegrationMetrics {
  serviceName: string;
  timestamp: number;
  responseTime: number;
  success: boolean;
  error?: string;
  statusCode?: number;
  requestSize?: number;
  responseSize?: number;
}

export interface ServiceHealth {
  serviceName: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  availability: number;
  averageResponseTime: number;
  successRate: number;
  errorRate: number;
  lastCheck: number;
  uptime: number;
  totalRequests: number;
  failedRequests: number;
}

export interface MonitoringConfig {
  enabled: boolean;
  metricsRetention: number; // hours
  healthCheckInterval: number; // seconds
  alertThresholds: {
    responseTime: number; // ms
    errorRate: number; // percentage
    availability: number; // percentage
  };
}

export interface AlertRule {
  serviceName: string;
  condition: (metrics: ServiceHealth) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  cooldown: number; // seconds
  lastTriggered?: number;
}

@Injectable()
export class IntegrationMonitoringService {
  private readonly logger = new Logger(IntegrationMonitoringService.name);
  private readonly metrics = new Map<string, IntegrationMetrics[]>();
  private readonly healthStatus = new Map<string, ServiceHealth>();
  private readonly alertRules = new Map<string, AlertRule[]>();
  private readonly config: MonitoringConfig;

  constructor(private configService: ConfigService) {
    this.config = {
      enabled: this.configService.get('INTEGRATION_MONITORING_ENABLED', true),
      metricsRetention: this.configService.get('INTEGRATION_METRICS_RETENTION', 24), // 24 hours
      healthCheckInterval: this.configService.get('INTEGRATION_HEALTH_CHECK_INTERVAL', 60), // 1 minute
      alertThresholds: {
        responseTime: this.configService.get('INTEGRATION_ALERT_RESPONSE_TIME', 5000), // 5 seconds
        errorRate: this.configService.get('INTEGRATION_ALERT_ERROR_RATE', 10), // 10%
        availability: this.configService.get('INTEGRATION_ALERT_AVAILABILITY', 95), // 95%
      },
    };

    this.initializeDefaultAlertRules();
  }

  /**
   * Record integration metrics
   *
   * @param serviceName - Service name
   * @param responseTime - Response time in milliseconds
   * @param success - Whether request was successful
   * @param error - Error message if failed
   * @param statusCode - HTTP status code
   * @param requestSize - Request size in bytes
   * @param responseSize - Response size in bytes
   */
  recordMetrics(
    serviceName: string,
    responseTime: number,
    success: boolean,
    error?: string,
    statusCode?: number,
    requestSize?: number,
    responseSize?: number,
  ): void {
    if (!this.config.enabled) return;

    const metrics: IntegrationMetrics = {
      serviceName,
      timestamp: Date.now(),
      responseTime,
      success,
      error,
      statusCode,
      requestSize,
      responseSize,
    };

    // Store metrics
    if (!this.metrics.has(serviceName)) {
      this.metrics.set(serviceName, []);
    }

    const serviceMetrics = this.metrics.get(serviceName)!;
    serviceMetrics.push(metrics);

    // Update health status
    this.updateHealthStatus(serviceName);

    // Check alerts
    this.checkAlerts(serviceName);

    // Cleanup old metrics
    this.cleanupOldMetrics(serviceName);

    this.logger.debug(`Metrics recorded for ${serviceName}`, {
      responseTime,
      success,
      statusCode,
    });
  }

  /**
   * Update health status for a service
   *
   * @param serviceName - Service name
   */
  private updateHealthStatus(serviceName: string): void {
    const serviceMetrics = this.metrics.get(serviceName);
    if (!serviceMetrics || serviceMetrics.length === 0) return;

    const now = Date.now();
    const recentMetrics = serviceMetrics.filter((m) => now - m.timestamp < 300000); // Last 5 minutes

    if (recentMetrics.length === 0) {
      // No recent data, mark as unhealthy
      this.healthStatus.set(serviceName, {
        serviceName,
        status: 'unhealthy',
        availability: 0,
        averageResponseTime: 0,
        successRate: 0,
        errorRate: 100,
        lastCheck: now,
        uptime: 0,
        totalRequests: 0,
        failedRequests: 0,
      });
      return;
    }

    // Calculate metrics
    const totalRequests = recentMetrics.length;
    const successfulRequests = recentMetrics.filter((m) => m.success).length;
    const failedRequests = totalRequests - successfulRequests;
    const responseTimes = recentMetrics.map((m) => m.responseTime);
    const averageResponseTime =
      responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length;
    const successRate = (successfulRequests / totalRequests) * 100;
    const errorRate = (failedRequests / totalRequests) * 100;
    const availability = successRate; // Simplified availability calculation

    // Determine health status
    let status: 'healthy' | 'degraded' | 'unhealthy';

    if (
      successRate >= this.config.alertThresholds.availability &&
      averageResponseTime <= this.config.alertThresholds.responseTime &&
      errorRate <= this.config.alertThresholds.errorRate
    ) {
      status = 'healthy';
    } else if (
      successRate >= 80 &&
      averageResponseTime <= this.config.alertThresholds.responseTime * 2
    ) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    // Calculate uptime (simplified - based on recent success rate)
    const uptime = successRate;

    this.healthStatus.set(serviceName, {
      serviceName,
      status,
      availability,
      averageResponseTime,
      successRate,
      errorRate,
      lastCheck: now,
      uptime,
      totalRequests,
      failedRequests,
    });
  }

  /**
   * Check alert conditions and trigger alerts
   *
   * @param serviceName - Service name
   */
  private checkAlerts(serviceName: string): void {
    const health = this.healthStatus.get(serviceName);
    const rules = this.alertRules.get(serviceName);

    if (!health || !rules) return;

    const now = Date.now();

    for (const rule of rules) {
      // Check cooldown
      if (rule.lastTriggered && now - rule.lastTriggered < rule.cooldown * 1000) {
        continue;
      }

      // Check condition
      if (rule.condition(health)) {
        this.triggerAlert(serviceName, rule);
        rule.lastTriggered = now;
      }
    }
  }

  /**
   * Trigger alert
   *
   * @param serviceName - Service name
   * @param rule - Alert rule
   */
  private triggerAlert(serviceName: string, rule: AlertRule): void {
    const alertMessage = `[${rule.severity.toUpperCase()}] ${serviceName}: ${rule.message}`;

    this.logger.warn(alertMessage);

    // Send alert to monitoring system
    this.sendAlert({
      serviceName,
      severity: rule.severity,
      message: rule.message,
      timestamp: Date.now(),
      health: this.healthStatus.get(serviceName),
    });
  }

  /**
   * Send alert to external monitoring system
   *
   * @param alert - Alert data
   */
  private sendAlert(alert: any): void {
    // In production, this would integrate with:
    // - Slack notifications
    // - PagerDuty
    // - Email alerts
    // - Monitoring dashboards

    this.logger.log('Alert sent:', alert);
  }

  /**
   * Cleanup old metrics based on retention policy
   *
   * @param serviceName - Service name
   */
  private cleanupOldMetrics(serviceName: string): void {
    const serviceMetrics = this.metrics.get(serviceName);
    if (!serviceMetrics) return;

    const cutoffTime = Date.now() - this.config.metricsRetention * 60 * 60 * 1000; // Convert hours to ms
    const filteredMetrics = serviceMetrics.filter((m) => m.timestamp > cutoffTime);

    this.metrics.set(serviceName, filteredMetrics);
  }

  /**
   * Initialize default alert rules
   */
  private initializeDefaultAlertRules(): void {
    const services = ['stripe', 'paypal', 'zoom', 'email', 'storage'];

    for (const serviceName of services) {
      const rules: AlertRule[] = [
        {
          serviceName,
          condition: (health) => health.status === 'unhealthy',
          severity: 'critical',
          message: 'Service is unhealthy',
          cooldown: 300, // 5 minutes
        },
        {
          serviceName,
          condition: (health: ServiceHealth) =>
            health.averageResponseTime > this.config.alertThresholds.responseTime,
          severity: 'medium',
          message: 'Response time too high',
          cooldown: 600, // 10 minutes
        },
        {
          serviceName,
          condition: (health: ServiceHealth) =>
            health.errorRate > this.config.alertThresholds.errorRate,
          severity: 'high',
          message: 'Error rate too high',
          cooldown: 300, // 5 minutes
        },
        {
          serviceName,
          condition: (health: ServiceHealth) =>
            health.availability < this.config.alertThresholds.availability,
          severity: 'high',
          message: 'Availability too low',
          cooldown: 600, // 10 minutes
        },
      ];

      this.alertRules.set(serviceName, rules);
    }
  }

  /**
   * Get health status for a service
   *
   * @param serviceName - Service name
   * @returns Service health status
   */
  getHealthStatus(serviceName: string): ServiceHealth | null {
    return this.healthStatus.get(serviceName) || null;
  }

  /**
   * Get health status for all services
   *
   * @returns Map of all service health statuses
   */
  getAllHealthStatus(): Map<string, ServiceHealth> {
    return new Map(this.healthStatus);
  }

  /**
   * Get metrics for a service
   *
   * @param serviceName - Service name
   * @param timeRange - Time range in hours (default: 1 hour)
   * @returns Array of metrics
   */
  getMetrics(serviceName: string, timeRange: number = 1): IntegrationMetrics[] {
    const serviceMetrics = this.metrics.get(serviceName);
    if (!serviceMetrics) return [];

    const cutoffTime = Date.now() - timeRange * 60 * 60 * 1000;
    return serviceMetrics.filter((m) => m.timestamp > cutoffTime);
  }

  /**
   * Get performance summary for a service
   *
   * @param serviceName - Service name
   * @param timeRange - Time range in hours (default: 24 hours)
   * @returns Performance summary
   */
  getPerformanceSummary(
    serviceName: string,
    timeRange: number = 24,
  ): {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    successRate: number;
    errorRate: number;
    averageResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
  } | null {
    const metrics = this.getMetrics(serviceName, timeRange);
    if (metrics.length === 0) return null;

    const totalRequests = metrics.length;
    const successfulRequests = metrics.filter((m) => m.success).length;
    const failedRequests = totalRequests - successfulRequests;
    const responseTimes = metrics.map((m) => m.responseTime);
    const sortedResponseTimes = responseTimes.sort((a, b) => a - b);

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      successRate: (successfulRequests / totalRequests) * 100,
      errorRate: (failedRequests / totalRequests) * 100,
      averageResponseTime: responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length,
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      p95ResponseTime: sortedResponseTimes[Math.floor(sortedResponseTimes.length * 0.95)],
      p99ResponseTime: sortedResponseTimes[Math.floor(sortedResponseTimes.length * 0.99)],
    };
  }

  /**
   * Get error patterns for a service
   *
   * @param serviceName - Service name
   * @param timeRange - Time range in hours (default: 24 hours)
   * @returns Error patterns
   */
  getErrorPatterns(
    serviceName: string,
    timeRange: number = 24,
  ): Array<{
    error: string;
    count: number;
    percentage: number;
    lastOccurred: number;
  }> | null {
    const metrics = this.getMetrics(serviceName, timeRange);
    const errorMetrics = metrics.filter((m) => !m.success && m.error);

    if (errorMetrics.length === 0) return null;

    // Group by error message
    const errorGroups = new Map<string, IntegrationMetrics[]>();

    for (const metric of errorMetrics) {
      const error = metric.error || 'Unknown error';
      if (!errorGroups.has(error)) {
        errorGroups.set(error, []);
      }
      errorGroups.get(error)!.push(metric);
    }

    // Calculate patterns
    const patterns = Array.from(errorGroups.entries()).map(([error, errors]) => ({
      error,
      count: errors.length,
      percentage: (errors.length / errorMetrics.length) * 100,
      lastOccurred: Math.max(...errors.map((e) => e.timestamp)),
    }));

    // Sort by frequency
    return patterns.sort((a, b) => b.count - a.count);
  }

  /**
   * Add custom alert rule
   *
   * @param serviceName - Service name
   * @param rule - Alert rule
   */
  addAlertRule(serviceName: string, rule: AlertRule): void {
    if (!this.alertRules.has(serviceName)) {
      this.alertRules.set(serviceName, []);
    }

    const rules = this.alertRules.get(serviceName)!;
    rules.push(rule);

    this.logger.log(`Alert rule added for ${serviceName}: ${rule.message}`);
  }

  /**
   * Remove alert rule
   *
   * @param serviceName - Service name
   * @param index - Rule index
   */
  removeAlertRule(serviceName: string, index: number): void {
    const rules = this.alertRules.get(serviceName);
    if (rules && index >= 0 && index < rules.length) {
      rules.splice(index, 1);
      this.logger.log(`Alert rule removed for ${serviceName} at index ${index}`);
    }
  }

  /**
   * Get alert rules for a service
   *
   * @param serviceName - Service name
   * @returns Alert rules
   */
  getAlertRules(serviceName: string): AlertRule[] {
    return this.alertRules.get(serviceName) || [];
  }

  /**
   * Reset monitoring data for a service
   *
   * @param serviceName - Service name
   */
  resetServiceData(serviceName: string): void {
    this.metrics.delete(serviceName);
    this.healthStatus.delete(serviceName);
    this.logger.log(`Monitoring data reset for ${serviceName}`);
  }

  /**
   * Reset all monitoring data
   */
  resetAllData(): void {
    this.metrics.clear();
    this.healthStatus.clear();
    this.logger.log('All monitoring data reset');
  }

  /**
   * Get overall system health
   *
   * @returns System health summary
   */
  getSystemHealth(): {
    overall: 'healthy' | 'degraded' | 'unhealthy';
    services: ServiceHealth[];
    summary: {
      totalServices: number;
      healthyServices: number;
      degradedServices: number;
      unhealthyServices: number;
      averageAvailability: number;
      averageResponseTime: number;
    };
  } {
    const services = Array.from(this.healthStatus.values());

    if (services.length === 0) {
      return {
        overall: 'unhealthy',
        services: [],
        summary: {
          totalServices: 0,
          healthyServices: 0,
          degradedServices: 0,
          unhealthyServices: 0,
          averageAvailability: 0,
          averageResponseTime: 0,
        },
      };
    }

    const healthyServices = services.filter((s) => s.status === 'healthy').length;
    const degradedServices = services.filter((s) => s.status === 'degraded').length;
    const unhealthyServices = services.filter((s) => s.status === 'unhealthy').length;

    let overall: 'healthy' | 'degraded' | 'unhealthy';

    if (unhealthyServices > 0) {
      overall = 'unhealthy';
    } else if (degradedServices > 0) {
      overall = 'degraded';
    } else {
      overall = 'healthy';
    }

    const averageAvailability =
      services.reduce((sum, s) => sum + s.availability, 0) / services.length;
    const averageResponseTime =
      services.reduce((sum, s) => sum + s.averageResponseTime, 0) / services.length;

    return {
      overall,
      services,
      summary: {
        totalServices: services.length,
        healthyServices,
        degradedServices,
        unhealthyServices,
        averageAvailability,
        averageResponseTime,
      },
    };
  }

  /**
   * Scheduled cleanup of old metrics
   */
  @Cron(CronExpression.EVERY_HOUR)
  cleanupMetrics(): void {
    if (!this.config.enabled) return;

    this.logger.log('Starting scheduled metrics cleanup...');

    for (const serviceName of this.metrics.keys()) {
      this.cleanupOldMetrics(serviceName);
    }

    this.logger.log('Scheduled metrics cleanup completed');
  }

  /**
   * Scheduled health check
   */
  @Cron(CronExpression.EVERY_MINUTE)
  healthCheck(): void {
    if (!this.config.enabled) return;

    // Update health status for all services
    for (const serviceName of this.metrics.keys()) {
      this.updateHealthStatus(serviceName);
    }
  }
}
