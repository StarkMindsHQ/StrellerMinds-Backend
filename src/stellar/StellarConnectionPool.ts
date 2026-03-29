import { Injectable, Logger } from '@nestjs/common';
import { Networks, Server } from 'stellar-sdk';

/**
 * Connection Pool Interface
 */
export interface StellarConnection {
  id: string;
  server: Server;
  lastUsed: Date;
  status: 'active' | 'busy' | 'closed';
  network: string;
}

/**
 * Connection Pool Management Service
 * Optimizes Stellar network interactions with a pool of persistent connections
 */
@Injectable()
export class StellarConnectionPool {
  private readonly logger = new Logger(StellarConnectionPool.name);
  private pool: Map<string, StellarConnection> = new Map();
  private readonly MAX_CONNECTIONS = 10;

  constructor() {
    this.createConnection('default', 'https://horizon-testnet.stellar.org', Networks.TESTNET);
  }

  /**
   * Create a new connection to the Stellar network
   */
  async createConnection(id: string, horizonUrl: string, network: string): Promise<StellarConnection> {
    if (this.pool.size >= this.MAX_CONNECTIONS) {
      this.logger.error('[Stellar Pool] Max connections reached');
    }

    const server = new Server(horizonUrl);
    const connection: StellarConnection = {
      id,
      server,
      lastUsed: new Date(),
      status: 'active',
      network,
    };

    this.pool.set(id, connection);
    this.logger.debug(`[Stellar Pool] Created new connection: ${id} (${horizonUrl})`);
    return connection;
  }

  /**
   * Get an active connection from the pool
   */
  async getConnection(id: string = 'default'): Promise<StellarConnection> {
    const connection = this.pool.get(id);
    
    if (!connection) {
      this.logger.warn(`[Stellar Pool] Connection ${id} not found. Returning default.`);
      return Array.from(this.pool.values())[0];
    }

    connection.lastUsed = new Date();
    return connection;
  }

  /**
   * Recycle and cleanup unhealthy connections
   */
  async recycleConnections(): Promise<void> {
    const now = Date.now();
    for (const [id, connection] of this.pool.entries()) {
      const idleTime = now - connection.lastUsed.getTime();
      if (idleTime > 300000) { // 5 minutes idle
        this.logger.debug(`[Stellar Pool] Recycling idle connection: ${id}`);
        this.pool.delete(id);
        // Logic to recreate connection if necessary
      }
    }
  }

  /**
   * Get all active connections in the pool
   */
  getActiveConnections(): StellarConnection[] {
    return Array.from(this.pool.values()).filter(c => c.status === 'active');
  }

  /**
   * Close and clear the connection pool
   */
  clearPool(): void {
    this.pool.clear();
    this.logger.debug('[Stellar Pool] Connection pool cleared');
  }
}
