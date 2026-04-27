import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface PoolStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingRequests: number;
  utilizationPercent: number;
  timestamp: Date;
}

@Injectable()
export class ConnectionPoolMonitor implements OnModuleInit {
  private readonly logger = new Logger(ConnectionPoolMonitor.name);
  private poolStats: PoolStats[] = [];
  private readonly maxStatsHistory = 100;
  private alertThresholds = {
    highUtilization: 80,
    criticalUtilization: 95,
    maxWaitingRequests: 10,
  };

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit() {
    this.logger.log('Connection Pool Monitor initialized');
    await this.checkPoolHealth();
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async monitorConnectionPool() {
    const stats = await this.getPoolStats();
    this.poolStats.push(stats);

    if (this.poolStats.length > this.maxStatsHistory) {
      this.poolStats.shift();
    }

    this.checkThresholds(stats);
  }

  async getPoolStats(): Promise<PoolStats> {
    const driver = this.dataSource.driver as any;
    const pool = driver.master || driver.pool;

    const totalConnections = pool?.totalCount || 0;
    const idleConnections = pool?.idleCount || 0;
    const waitingRequests = pool?.waitingCount || 0;
    const activeConnections = totalConnections - idleConnections;
    const utilizationPercent = totalConnections > 0 
      ? Math.round((activeConnections / totalConnections) * 100) 
      : 0;

    return {
      totalConnections,
      activeConnections,
      idleConnections,
      waitingRequests,
      utilizationPercent,
      timestamp: new Date(),
    };
  }

  private checkThresholds(stats: PoolStats) {
    if (stats.utilizationPercent >= this.alertThresholds.criticalUtilization) {
      this.logger.error(
        `CRITICAL: Connection pool utilization at ${stats.utilizationPercent}%`,
      );
      this.eventEmitter.emit('pool.critical', stats);
    } else if (stats.utilizationPercent >= this.alertThresholds.highUtilization) {
      this.logger.warn(
        `WARNING: Connection pool utilization at ${stats.utilizationPercent}%`,
      );
      this.eventEmitter.emit('pool.warning', stats);
    }

    if (stats.waitingRequests >= this.alertThresholds.maxWaitingRequests) {
      this.logger.error(
        `CRITICAL: ${stats.waitingRequests} requests waiting for connections`,
      );
      this.eventEmitter.emit('pool.waiting.critical', stats);
    }
  }

  async checkPoolHealth(): Promise<{ healthy: boolean; stats: PoolStats }> {
    const stats = await this.getPoolStats();
    const healthy = stats.utilizationPercent < this.alertThresholds.criticalUtilization 
      && stats.waitingRequests < this.alertThresholds.maxWaitingRequests;

    return { healthy, stats };
  }

  getRecentStats(count: number = 10): PoolStats[] {
    return this.poolStats.slice(-count);
  }

  getAverageUtilization(minutes: number = 5): number {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    const recentStats = this.poolStats.filter(s => s.timestamp >= cutoff);
    
    if (recentStats.length === 0) return 0;
    
    const sum = recentStats.reduce((acc, s) => acc + s.utilizationPercent, 0);
    return Math.round(sum / recentStats.length);
  }
}
