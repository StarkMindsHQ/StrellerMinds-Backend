import { Injectable, Logger } from '@nestjs/common';

export interface PoolConfig {
  min: number;
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
  acquireTimeoutMillis?: number;
  validateOnCheckout?: boolean;
}

export interface PoolMetrics {
  activeConnections: number;
  idleConnections: number;
  waitingQueries: number;
  totalCreated: number;
  totalDestroyed: number;
  totalErrors: number;
  utilization: number;
  averageWaitTime: number;
  peakConnections: number;
  lastCheck: Date;
}

export interface PoolConnectionEvent {
  timestamp: Date;
  eventType: 'acquired' | 'released' | 'created' | 'destroyed' | 'timeout' | 'error';
  connectionId: string;
  detail?: string;
}

@Injectable()
export class ConnectionPool {
  private readonly logger = new Logger(ConnectionPool.name);
  private poolConfig: PoolConfig;
  private activeConnections: Set<string> = new Set();
  private idleConnections: number = 0;
  private waitingQueries: number = 0;
  private metrics: PoolMetrics;
  private connectionLog: PoolConnectionEvent[] = [];
  private readonly MAX_LOG_SIZE = 1000;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.poolConfig = {
      min: 10,
      max: 50,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      acquireTimeoutMillis: 5000,
      validateOnCheckout: true,
    };

    this.metrics = {
      activeConnections: 0,
      idleConnections: this.poolConfig.min,
      waitingQueries: 0,
      totalCreated: this.poolConfig.min,
      totalDestroyed: 0,
      totalErrors: 0,
      utilization: 0,
      averageWaitTime: 0,
      peakConnections: 0,
      lastCheck: new Date(),
    };

    this.initializePool();
  }

  /**
   * Initialize the connection pool with minimum connections.
   */
  private initializePool(): void {
    this.logger.log(
      `Initializing connection pool: min=${this.poolConfig.min}, max=${this.poolConfig.max}`,
    );
    this.idleConnections = this.poolConfig.min;
    this.startMonitoring();
  }

  /**
   * Acquire a connection from the pool.
   */
  acquireConnection(): { connectionId: string; waitTime: number } {
    const connectionId = `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    // Simulate acquiring from idle pool
    if (this.idleConnections > 0) {
      this.idleConnections--;
      this.activeConnections.add(connectionId);
      this.metrics.activeConnections = this.activeConnections.size;
    } else if (this.activeConnections.size < this.poolConfig.max) {
      // Create new connection if under max
      this.activeConnections.add(connectionId);
      this.metrics.activeConnections = this.activeConnections.size;
      this.metrics.totalCreated++;
    } else {
      // Wait for connection
      this.waitingQueries++;
      this.metrics.waitingQueries = this.waitingQueries;
      this.logger.debug(`Connection pool exhausted. Waiting queries: ${this.waitingQueries}`);
    }

    const waitTime = Date.now() - startTime;
    this.logConnectionEvent('acquired', connectionId);
    return { connectionId, waitTime };
  }

  /**
   * Release a connection back to the pool.
   */
  releaseConnection(connectionId: string): void {
    if (this.activeConnections.has(connectionId)) {
      this.activeConnections.delete(connectionId);
      this.idleConnections++;
      this.metrics.activeConnections = this.activeConnections.size;
      
      if (this.waitingQueries > 0) {
        this.waitingQueries--;
      }
    }
    this.logConnectionEvent('released', connectionId);
  }

  /**
   * Destroy a connection (due to error or idle timeout).
   */
  destroyConnection(connectionId: string): void {
    if (this.activeConnections.has(connectionId)) {
      this.activeConnections.delete(connectionId);
      this.idleConnections = Math.max(0, this.idleConnections - 1);
    }
    this.metrics.totalDestroyed++;
    this.logConnectionEvent('destroyed', connectionId);
    this.logger.warn(`Connection destroyed: ${connectionId}`);
  }

  /**
   * Optimizes the connection pool based on current application load.
   */
  optimizePool(loadFactor: number): void {
    const previousMax = this.poolConfig.max;
    
    // Adjust pool size dynamically based on load (0-100)
    if (loadFactor > 80) {
      this.poolConfig.max = Math.min(this.poolConfig.max + 10, 100);
      this.logger.warn(
        `High load detected (${loadFactor}%). Increasing pool max: ${previousMax} -> ${this.poolConfig.max}`,
      );
    } else if (loadFactor < 20) {
      this.poolConfig.max = Math.max(this.poolConfig.max - 5, this.poolConfig.min);
      this.logger.info(
        `Low load detected (${loadFactor}%). Decreasing pool max: ${previousMax} -> ${this.poolConfig.max}`,
      );
    }

    // Adjust min pool size if needed
    if (this.metrics.activeConnections > this.poolConfig.min * 0.8) {
      this.poolConfig.min = Math.ceil(this.poolConfig.min * 1.2);
      this.logger.info(`Increasing minimum pool size to ${this.poolConfig.min}`);
    }
  }

  /**
   * Retrieves the current connection pool configuration.
   */
  getPoolConfig(): PoolConfig {
    return { ...this.poolConfig };
  }

  /**
   * Monitors pool usage and health.
   */
  monitorPoolHealth(): PoolMetrics {
    this.metrics.lastCheck = new Date();
    this.metrics.activeConnections = this.activeConnections.size;
    this.metrics.idleConnections = this.idleConnections;
    this.metrics.utilization = 
      (this.metrics.activeConnections / this.poolConfig.max) * 100;

    if (this.metrics.activeConnections > this.metrics.peakConnections) {
      this.metrics.peakConnections = this.metrics.activeConnections;
    }

    this.logger.debug(
      `Pool status - Active: ${this.metrics.activeConnections}, ` +
      `Idle: ${this.metrics.idleConnections}, ` +
      `Waiting: ${this.metrics.waitingQueries}, ` +
      `Utilization: ${this.metrics.utilization.toFixed(2)}%`,
    );

    return { ...this.metrics };
  }

  /**
   * Get current pool metrics.
   */
  getMetrics(): PoolMetrics {
    return this.monitorPoolHealth();
  }

  /**
   * Start periodic pool monitoring.
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      const metrics = this.monitorPoolHealth();
      
      // Auto-optimize based on current load
      const loadFactor = metrics.utilization;
      this.optimizePool(loadFactor);

      // Cleanup idle connections if needed
      if (this.idleConnections > this.poolConfig.min) {
        const excess = this.idleConnections - this.poolConfig.min;
        if (excess > 0) {
          this.idleConnections -= excess;
          this.metrics.totalDestroyed += excess;
          this.logger.debug(`Cleaned up ${excess} idle connections`);
        }
      }
    }, 30000); // Monitor every 30 seconds
  }

  /**
   * Log connection events for debugging.
   */
  private logConnectionEvent(
    eventType: 'acquired' | 'released' | 'created' | 'destroyed' | 'timeout' | 'error',
    connectionId: string,
    detail?: string,
  ): void {
    const event: PoolConnectionEvent = {
      timestamp: new Date(),
      eventType,
      connectionId,
      detail,
    };
    this.connectionLog.push(event);

    // Keep log size manageable
    if (this.connectionLog.length > this.MAX_LOG_SIZE) {
      this.connectionLog = this.connectionLog.slice(-this.MAX_LOG_SIZE);
    }
  }

  /**
   * Get recent connection events.
   */
  getConnectionLog(limit: number = 100): PoolConnectionEvent[] {
    return this.connectionLog.slice(-limit);
  }

  /**
   * Record a pool error.
   */
  recordError(connectionId: string, error: Error): void {
    this.metrics.totalErrors++;
    this.logConnectionEvent('error', connectionId, error.message);
    this.logger.error(`Connection error on ${connectionId}: ${error.message}`);
  }

  /**
   * Drain the pool (close all connections).
   */
  async drain(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    this.activeConnections.clear();
    this.idleConnections = 0;
    this.metrics.totalDestroyed += this.metrics.totalCreated;
    this.logger.log('Connection pool drained');
  }

  /**
   * Reset pool metrics.
   */
  resetMetrics(): void {
    this.metrics = {
      activeConnections: 0,
      idleConnections: this.poolConfig.min,
      waitingQueries: 0,
      totalCreated: 0,
      totalDestroyed: 0,
      totalErrors: 0,
      utilization: 0,
      averageWaitTime: 0,
      peakConnections: 0,
      lastCheck: new Date(),
    };
    this.logger.log('Pool metrics reset');
  }
}
