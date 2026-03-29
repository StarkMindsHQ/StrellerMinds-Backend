import { Injectable, Logger } from '@nestjs/common';
import { StellarConnectionPool } from '../stellar/StellarConnectionPool';
import { TransactionBatcher } from '../stellar/TransactionBatcher';
import { NetworkMonitor } from '../stellar/NetworkMonitor';
import { Transaction } from 'stellar-sdk';

/**
 * Stellar Network Optimization Service
 * Orchestrates connection pooling, transaction batching, and network health monitoring
 */
@Injectable()
export class StellarOptimizationService {
  private readonly logger = new Logger(StellarOptimizationService.name);

  constructor(
    private readonly connectionPool: StellarConnectionPool,
    private readonly transactionBatcher: TransactionBatcher,
    private readonly networkMonitor: NetworkMonitor,
  ) {
    this.init();
  }

  /**
   * Monitor health and automatically optimize service parameters
   */
  private async init(): Promise<void> {
    this.logger.log('[Stellar Service] Initializing optimization service...');
    await this.networkMonitor.checkHealth();
    
    // Periodically recycle connection pool and check health
    setInterval(async () => {
      await this.connectionPool.recycleConnections();
      const health = await this.networkMonitor.checkHealth();
      
      if (health.status !== 'healthy') {
        this.logger.warn(`[Stellar Service] Network status: ${health.status}. Optimizing retry parameters.`);
        // Logic to adjust batching window and retry backoffs
      }
    }, 60000); // 1 minute interval
  }

  /**
   * Optimized transaction submission with smart retry and batching
   */
  async submitOptimizedTransaction(transaction: Transaction): Promise<any> {
    const health = this.networkMonitor.getHealth();
    
    // Auto-failover logic based on network health
    if (health.status === 'unavailable') {
      this.logger.error('[Stellar Service] Network unavailable. Switching to failover strategy.');
      await this.networkMonitor.initiateFailover('testnet');
    }

    try {
      const connection = await this.connectionPool.getConnection();
      this.logger.debug(`[Stellar Service] Using connection ${connection.id} for transaction submission.`);
      
      const result = await this.transactionBatcher.submitWithRetry(transaction);
      this.logger.log(`[Stellar Service] Transaction ${result.hash} submitted successfully on ledger ${result.ledger}`);
      return result;
    } catch (err) {
      this.logger.error(`[Stellar Service] Optimized transaction submission failed: ${err.message}`);
      throw err;
    }
  }

  /**
   * Batch an operation for efficient network interaction
   */
  async batchOperation(operation: any): Promise<any> {
    return this.transactionBatcher.add(operation);
  }

  /**
   * Comprehensive status of all optimization components
   */
  getOptimizationStatus(): any {
    return {
      pool: this.connectionPool.getActiveConnections().map(c => ({ id: c.id, status: c.status })),
      batcher: this.transactionBatcher.getBatcherStatus(),
      network: this.networkMonitor.getHealth(),
    };
  }
}
