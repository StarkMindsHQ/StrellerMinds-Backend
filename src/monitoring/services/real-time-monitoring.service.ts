import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { ApmService } from './apm.service';
import { Transaction } from '../interfaces/apm.interface';

@Injectable()
export class RealTimeMonitoringService implements OnModuleInit {
  private readonly logger = new Logger(RealTimeMonitoringService.name);
  private recentEvents: any[] = [];
  private readonly maxEventHistory = 1000;
  private anomalies: any[] = [];
  private alerts: any[] = [];

  constructor(
    private readonly apmService: ApmService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  onModuleInit() {
    this.logger.log('Real-time monitoring initialized');
    this.startRealTimeLogAnalysis();
  }

  @OnEvent('transaction.completed')
  handleTransactionCompleted(transaction: Transaction) {
    this.processEvent('transaction', transaction);
    this.detectAnomalies(transaction);
    this.checkAlerts(transaction);
  }

  private processEvent(type: string, data: any) {
    const event = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      timestamp: new Date(),
      type,
      data,
    };

    this.recentEvents.push(event);
    if (this.recentEvents.length > this.maxEventHistory) {
      this.recentEvents.shift();
    }

    // Emit real-time update event for consumers (e.g., WebSockets)
    this.eventEmitter.emit('monitoring.realtime.update', event);
  }

  private detectAnomalies(transaction: Transaction) {
    // Current resource usage from history
    const history = this.apmService.getPerformanceHistory(50);
    if (history.length < 10) return;

    const latestSnapshot = history[history.length - 1];

    // CPU Spike detection
    const avgCpu = history.reduce((sum, s) => sum + s.cpu.percentage, 0) / history.length;
    if (latestSnapshot.cpu.percentage > avgCpu * 2 && latestSnapshot.cpu.percentage > 0.5) {
      const anomaly = {
        id: `cpu_${Date.now()}`,
        timestamp: new Date(),
        type: 'CPU_SPIKE',
        message: `CPU usage spiked to ${Math.round(latestSnapshot.cpu.percentage * 100)}% (avg: ${Math.round(avgCpu * 100)}%)`,
        severity: 'high',
      };
      this.anomalies.push(anomaly);
      this.eventEmitter.emit('monitoring.anomaly', anomaly);
    }

    // SLOW TRANSACTION detection
    if (transaction.duration && transaction.duration > 2000) {
      const anomaly = {
        id: `slow_tx_${Date.now()}`,
        timestamp: new Date(),
        type: 'SLOW_TRANSACTION',
        message: `Transaction '${transaction.name}' took ${transaction.duration}ms`,
        severity: 'medium',
        metadata: { id: transaction.id },
      };
      this.anomalies.push(anomaly);
      this.eventEmitter.emit('monitoring.anomaly', anomaly);
    }
  }

  private checkAlerts(transaction: Transaction) {
    if (transaction.status === 'error') {
      const alert = {
        id: `alert_err_${Date.now()}`,
        timestamp: new Date(),
        type: 'TRANSACTION_ERROR',
        message: `High priority alert: Transaction '${transaction.name}' failed`,
        severity: 'critical',
        metadata: { id: transaction.id, error: transaction.metadata?.error },
      };
      this.alerts.push(alert);
      this.eventEmitter.emit('monitoring.alert', alert);
    }
  }

  async getRealTimeDashboard() {
    const currentStats = await this.apmService.getCurrentMetrics();
    return {
      stats: currentStats,
      recentEvents: this.recentEvents.slice(-20),
      anomalies: this.anomalies.slice(-10),
      alerts: this.alerts.slice(-10),
      isHealthy: currentStats.errorRate < 5 && currentStats.cpuUsage < 80,
    };
  }

  getAnomalies() {
    return this.anomalies;
  }

  getAlerts() {
    return this.alerts;
  }

  private startRealTimeLogAnalysis() {
    this.logger.log('Real-time log analyzer started');
    // Integration would normally subscribe to log stream
  }
}
