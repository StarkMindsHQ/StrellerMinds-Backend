/**
 * Integration Monitoring & Health Check System
 * Tracks health, metrics, alerts, and provides a unified status dashboard
 */

import { BaseIntegration, IntegrationHealth, IntegrationStatus, sleep } from '../core/base';
import { globalEventBus } from './evemt.bus';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MonitoringConfig {
  checkIntervalMs: number; // How often to poll (default: 60s)
  alertThresholds: AlertThresholds;
  retentionPeriodMs: number; // How long to keep history (default: 24h)
}

export interface AlertThresholds {
  maxErrorRate: number; // 0-1, e.g., 0.1 = 10% error rate
  maxLatencyMs: number; // Alert if avg latency exceeds this
  minUptime: number; // 0-1, alert if uptime drops below
  consecutiveFailures: number; // Alert after N consecutive failures
}

export interface HealthSnapshot {
  timestamp: Date;
  integrationId: string;
  health: IntegrationHealth;
}

export interface Alert {
  id: string;
  integrationId: string;
  severity: 'info' | 'warning' | 'critical';
  type: AlertType;
  message: string;
  triggeredAt: Date;
  resolvedAt?: Date;
  resolved: boolean;
  metadata?: Record<string, unknown>;
}

export type AlertType =
  | 'high_error_rate'
  | 'high_latency'
  | 'integration_down'
  | 'circuit_breaker_open'
  | 'low_uptime'
  | 'consecutive_failures';

export interface IntegrationDashboard {
  timestamp: Date;
  integrations: IntegrationSummary[];
  overallHealth: 'healthy' | 'degraded' | 'down';
  activeAlerts: number;
  totalRequests: number;
  successRate: number;
}

export interface IntegrationSummary {
  id: string;
  name: string;
  status: IntegrationStatus;
  health: IntegrationHealth;
  uptime: number;
  activeAlerts: Alert[];
  last24hRequests: number;
  last24hErrors: number;
  avgLatencyMs: number;
  trend: 'improving' | 'stable' | 'degrading';
}

// ─── Monitor ──────────────────────────────────────────────────────────────────

export class IntegrationMonitor {
  private integrations = new Map<string, BaseIntegration>();
  private healthHistory = new Map<string, HealthSnapshot[]>();
  private alerts = new Map<string, Alert[]>();
  private consecutiveFailures = new Map<string, number>();
  private timers = new Map<string, NodeJS.Timeout>();
  private config: MonitoringConfig;

  constructor(config?: Partial<MonitoringConfig>) {
    this.config = {
      checkIntervalMs: config?.checkIntervalMs ?? 60000,
      retentionPeriodMs: config?.retentionPeriodMs ?? 86400000,
      alertThresholds: {
        maxErrorRate: 0.1,
        maxLatencyMs: 5000,
        minUptime: 0.95,
        consecutiveFailures: 3,
        ...config?.alertThresholds,
      },
    };
  }

  // ─── Registration ──────────────────────────────────────────────────────────

  register(integration: BaseIntegration): void {
    const id = integration.getId();
    this.integrations.set(id, integration);
    this.healthHistory.set(id, []);
    this.alerts.set(id, []);
    this.consecutiveFailures.set(id, 0);
    this.startPolling(id);
  }

  unregister(integrationId: string): void {
    this.integrations.delete(integrationId);
    this.stopPolling(integrationId);
  }

  private startPolling(integrationId: string): void {
    const timer = setInterval(() => this.checkHealth(integrationId), this.config.checkIntervalMs);
    this.timers.set(integrationId, timer);

    // Immediate first check
    setTimeout(() => this.checkHealth(integrationId), 100);
  }

  private stopPolling(integrationId: string): void {
    const timer = this.timers.get(integrationId);
    if (timer) clearInterval(timer);
    this.timers.delete(integrationId);
  }

  // ─── Health Checks ─────────────────────────────────────────────────────────

  async checkHealth(integrationId: string): Promise<IntegrationHealth | null> {
    const integration = this.integrations.get(integrationId);
    if (!integration) return null;

    try {
      const health = await integration.healthCheck();
      await this.recordHealth(integrationId, health);
      return health;
    } catch (err) {
      const errorHealth: IntegrationHealth = {
        integrationId,
        status: IntegrationStatus.ERROR,
        lastChecked: new Date(),
        errorMessage: err instanceof Error ? err.message : 'Health check failed',
        metrics: integration.getMetrics(),
      };
      await this.recordHealth(integrationId, errorHealth);
      return errorHealth;
    }
  }

  async checkAllHealth(): Promise<Map<string, IntegrationHealth>> {
    const results = new Map<string, IntegrationHealth>();
    const checks = [...this.integrations.keys()].map(async (id) => {
      const health = await this.checkHealth(id);
      if (health) results.set(id, health);
    });
    await Promise.allSettled(checks);
    return results;
  }

  private async recordHealth(integrationId: string, health: IntegrationHealth): Promise<void> {
    const snapshot: HealthSnapshot = {
      timestamp: new Date(),
      integrationId,
      health,
    };

    const history = this.healthHistory.get(integrationId) ?? [];
    history.push(snapshot);

    // Prune old history
    const cutoff = Date.now() - this.config.retentionPeriodMs;
    const pruned = history.filter((s) => s.timestamp.getTime() > cutoff);
    this.healthHistory.set(integrationId, pruned);

    // Track consecutive failures
    if (health.status === IntegrationStatus.ERROR) {
      const failures = (this.consecutiveFailures.get(integrationId) ?? 0) + 1;
      this.consecutiveFailures.set(integrationId, failures);
    } else {
      this.consecutiveFailures.set(integrationId, 0);
    }

    await this.evaluateAlerts(integrationId, health);
    await globalEventBus.publish('monitor', 'health.checked', {
      integrationId,
      status: health.status,
    });
  }

  // ─── Alerting ─────────────────────────────────────────────────────────────

  private async evaluateAlerts(integrationId: string, health: IntegrationHealth): Promise<void> {
    const thresholds = this.config.alertThresholds;
    const metrics = health.metrics;

    // Check integration down
    if (health.status === IntegrationStatus.ERROR) {
      await this.raiseAlert(
        integrationId,
        'integration_down',
        'critical',
        `Integration ${integrationId} is DOWN: ${health.errorMessage}`,
      );
    } else {
      this.resolveAlert(integrationId, 'integration_down');
    }

    // Check error rate
    if (metrics.totalRequests > 10) {
      const errorRate = metrics.failedRequests / metrics.totalRequests;
      if (errorRate > thresholds.maxErrorRate) {
        await this.raiseAlert(
          integrationId,
          'high_error_rate',
          'warning',
          `High error rate: ${(errorRate * 100).toFixed(1)}% (threshold: ${thresholds.maxErrorRate * 100}%)`,
        );
      } else {
        this.resolveAlert(integrationId, 'high_error_rate');
      }
    }

    // Check latency
    if (health.latencyMs !== undefined && health.latencyMs > thresholds.maxLatencyMs) {
      await this.raiseAlert(
        integrationId,
        'high_latency',
        'warning',
        `High latency: ${health.latencyMs}ms (threshold: ${thresholds.maxLatencyMs}ms)`,
      );
    } else {
      this.resolveAlert(integrationId, 'high_latency');
    }

    // Check consecutive failures
    const failures = this.consecutiveFailures.get(integrationId) ?? 0;
    if (failures >= thresholds.consecutiveFailures) {
      await this.raiseAlert(
        integrationId,
        'consecutive_failures',
        'critical',
        `${failures} consecutive failures detected`,
      );
    } else if (failures === 0) {
      this.resolveAlert(integrationId, 'consecutive_failures');
    }
  }

  private async raiseAlert(
    integrationId: string,
    type: AlertType,
    severity: Alert['severity'],
    message: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const existingAlerts = this.alerts.get(integrationId) ?? [];
    const existing = existingAlerts.find((a) => a.type === type && !a.resolved);
    if (existing) return; // Don't re-raise active alerts

    const alert: Alert = {
      id: `${integrationId}-${type}-${Date.now()}`,
      integrationId,
      severity,
      type,
      message,
      triggeredAt: new Date(),
      resolved: false,
      metadata,
    };

    existingAlerts.push(alert);
    this.alerts.set(integrationId, existingAlerts);

    await globalEventBus.publish('monitor', 'alert.raised', {
      alert,
    });

    console.warn(`[ALERT] [${severity.toUpperCase()}] ${integrationId}: ${message}`);
  }

  private resolveAlert(integrationId: string, type: AlertType): void {
    const alerts = this.alerts.get(integrationId) ?? [];
    const alert = alerts.find((a) => a.type === type && !a.resolved);
    if (!alert) return;

    alert.resolved = true;
    alert.resolvedAt = new Date();

    globalEventBus.publish('monitor', 'alert.resolved', { alert });
  }

  // ─── Dashboard ─────────────────────────────────────────────────────────────

  getDashboard(): IntegrationDashboard {
    const summaries: IntegrationSummary[] = [];
    let totalRequests = 0;
    let totalSuccess = 0;

    for (const [id, integration] of this.integrations) {
      const history = this.healthHistory.get(id) ?? [];
      const alerts = (this.alerts.get(id) ?? []).filter((a) => !a.resolved);
      const metrics = integration.getMetrics();

      totalRequests += metrics.totalRequests;
      totalSuccess += metrics.successfulRequests;

      const latest = history[history.length - 1];
      const uptime = this.calculateUptime(history);
      const trend = this.calculateTrend(history);

      summaries.push({
        id,
        name: integration.getName(),
        status: latest?.health.status ?? IntegrationStatus.DISCONNECTED,
        health: latest?.health ?? {
          integrationId: id,
          status: IntegrationStatus.DISCONNECTED,
          lastChecked: new Date(0),
          metrics: integration.getMetrics(),
        },
        uptime,
        activeAlerts: alerts,
        last24hRequests: metrics.totalRequests,
        last24hErrors: metrics.failedRequests,
        avgLatencyMs: metrics.averageLatencyMs,
        trend,
      });
    }

    const overallStatus = this.calculateOverallHealth(summaries);
    const activeAlerts = summaries.reduce((sum, s) => sum + s.activeAlerts.length, 0);

    return {
      timestamp: new Date(),
      integrations: summaries,
      overallHealth: overallStatus,
      activeAlerts,
      totalRequests,
      successRate: totalRequests > 0 ? totalSuccess / totalRequests : 1,
    };
  }

  private calculateUptime(history: HealthSnapshot[]): number {
    if (history.length === 0) return 1;
    const successful = history.filter(
      (s) => s.health.status === IntegrationStatus.CONNECTED,
    ).length;
    return successful / history.length;
  }

  private calculateTrend(history: HealthSnapshot[]): 'improving' | 'stable' | 'degrading' {
    if (history.length < 6) return 'stable';

    const recentHalf = history.slice(-Math.floor(history.length / 2));
    const olderHalf = history.slice(0, Math.floor(history.length / 2));

    const recentErrors = recentHalf.filter(
      (s) => s.health.status === IntegrationStatus.ERROR,
    ).length;
    const olderErrors = olderHalf.filter((s) => s.health.status === IntegrationStatus.ERROR).length;

    if (recentErrors < olderErrors) return 'improving';
    if (recentErrors > olderErrors) return 'degrading';
    return 'stable';
  }

  private calculateOverallHealth(summaries: IntegrationSummary[]): 'healthy' | 'degraded' | 'down' {
    const critical = summaries.filter(
      (s) =>
        s.status === IntegrationStatus.ERROR ||
        s.activeAlerts.some((a) => a.severity === 'critical'),
    ).length;

    if (critical === summaries.length) return 'down';
    if (critical > 0) return 'degraded';
    return 'healthy';
  }

  // ─── Queries ───────────────────────────────────────────────────────────────

  getHealthHistory(integrationId: string, since?: Date): HealthSnapshot[] {
    const history = this.healthHistory.get(integrationId) ?? [];
    if (!since) return history;
    return history.filter((s) => s.timestamp >= since);
  }

  getActiveAlerts(integrationId?: string): Alert[] {
    if (integrationId) {
      return (this.alerts.get(integrationId) ?? []).filter((a) => !a.resolved);
    }

    const all: Alert[] = [];
    for (const alerts of this.alerts.values()) {
      all.push(...alerts.filter((a) => !a.resolved));
    }
    return all;
  }

  getAllAlerts(integrationId?: string): Alert[] {
    if (integrationId) return this.alerts.get(integrationId) ?? [];
    const all: Alert[] = [];
    for (const alerts of this.alerts.values()) all.push(...alerts);
    return all;
  }

  async forceCheck(integrationId: string): Promise<IntegrationHealth | null> {
    return this.checkHealth(integrationId);
  }

  stopAll(): void {
    for (const id of this.timers.keys()) {
      this.stopPolling(id);
    }
  }
}

// ─── Utility: Format Dashboard as Text ────────────────────────────────────────

export function formatDashboard(dashboard: IntegrationDashboard): string {
  const lines: string[] = [
    `╔══════════════════════════════════════════════════════╗`,
    `║          INTEGRATION HEALTH DASHBOARD                ║`,
    `║  ${dashboard.timestamp.toISOString()}  ║`,
    `╚══════════════════════════════════════════════════════╝`,
    ``,
    `Overall: ${dashboard.overallHealth.toUpperCase()} | ` +
      `Active Alerts: ${dashboard.activeAlerts} | ` +
      `Total Requests: ${dashboard.totalRequests} | ` +
      `Success Rate: ${(dashboard.successRate * 100).toFixed(1)}%`,
    ``,
  ];

  for (const integration of dashboard.integrations) {
    const statusIcon =
      {
        [IntegrationStatus.CONNECTED]: '✅',
        [IntegrationStatus.DISCONNECTED]: '⭕',
        [IntegrationStatus.ERROR]: '❌',
        [IntegrationStatus.PENDING]: '⏳',
        [IntegrationStatus.RATE_LIMITED]: '⚠️',
      }[integration.status] ?? '❓';

    const trendIcon = {
      improving: '📈',
      stable: '➡️',
      degrading: '📉',
    }[integration.trend];

    lines.push(
      `${statusIcon} ${integration.name.padEnd(30)} ${trendIcon} ` +
        `Uptime: ${(integration.uptime * 100).toFixed(1)}% | ` +
        `Latency: ${integration.avgLatencyMs.toFixed(0)}ms | ` +
        `Errors: ${integration.last24hErrors}/${integration.last24hRequests}`,
    );

    for (const alert of integration.activeAlerts) {
      lines.push(`   ⚠️  [${alert.severity.toUpperCase()}] ${alert.message}`);
    }
  }

  return lines.join('\n');
}
