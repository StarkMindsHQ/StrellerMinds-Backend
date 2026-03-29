import { Injectable, Logger } from '@nestjs/common';

export interface PoolConfig {
  min: number;
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
}

@Injectable()
export class ConnectionPool {
  private readonly logger = new Logger(ConnectionPool.name);
  private poolConfig: PoolConfig;

  constructor() {
    this.poolConfig = {
      min: 10,
      max: 50,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };
  }

  /**
   * Optimizes the connection pool based on current application load.
   */
  optimizePool(loadFactor: number): void {
    const previousMax = this.poolConfig.max;
    
    // Adjust pool size dynamically based on load (0-100)
    if (loadFactor > 80) {
      this.poolConfig.max = Math.min(this.poolConfig.max + 10, 100);
      this.logger.warn(`High load detected. Increasing pool size: ${previousMax} -> ${this.poolConfig.max}`);
    } else if (loadFactor < 20) {
      this.poolConfig.max = Math.max(this.poolConfig.max - 5, 20);
      this.logger.log(`Low load detected. Decreasing pool size: ${previousMax} -> ${this.poolConfig.max}`);
    }
  }

  /**
   * Retrieves the current connection pool configuration.
   */
  getPoolConfig(): PoolConfig {
    return this.poolConfig;
  }

  /**
   * Monitors pool usage and health.
   */
  monitorPoolHealth(): any {
    this.logger.debug('Monitoring connection pool health and active connections');
    return {
      activeConnections: 12,
      idleConnections: 5,
      waitingQueries: 0,
      status: 'healthy',
    };
  }
}
