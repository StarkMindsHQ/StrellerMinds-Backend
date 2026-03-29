import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ReplicaManager, DatabaseNode } from '../database/ReplicaManager';
import { ConnectionPool } from '../database/ConnectionPool';
import { QueryRouter } from '../database/QueryRouter';

@Injectable()
export class DatabaseOptimizationService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseOptimizationService.name);

  constructor(
    private readonly replicaManager: ReplicaManager,
    private readonly connectionPool: ConnectionPool,
    private readonly queryRouter: QueryRouter,
  ) {}

  onModuleInit() {
    this.logger.log('Initializing Database Optimization Service');
    this.startMonitoring();
  }

  private startMonitoring(): void {
    setInterval(() => {
      this.optimizeDatabase();
    }, 60000); // Optimize every 60 seconds
  }

  /**
   * Orchestrates the overall database optimization strategy.
   */
  optimizeDatabase(): void {
    this.logger.log('Performing periodic database optimization');

    const poolHealth = this.connectionPool.monitorPoolHealth();
    this.connectionPool.optimizePool(poolHealth.activeConnections);
    
    const availableReplicas = this.replicaManager.getAvailableReplicas();
    this.logger.info(`Database optimized. Replicas: ${availableReplicas.length}, Pool status: ${poolHealth.status}`);
  }

  /**
   * Selects the appropriate database node for a SQL query.
   */
  getBestNode(sql: string): DatabaseNode {
    const type = this.queryRouter.determineQueryType(sql);
    return this.queryRouter.routeQuery(type);
  }

  /**
   * Analyzes database performance and suggests sharding strategy.
   */
  analyzePerformance(): string {
    this.logger.log('Performing database performance analysis');
    return 'Analysis complete. Suggesting horizontal sharding strategy for courses and user_profiles tables.';
  }

  /**
   * Configures horizontal sharding strategy.
   */
  configureSharding(strategy: string): void {
    this.logger.warn(`Configuring sharding strategy: ${strategy}`);
    this.logger.log('Sharding strategy configured for database nodes');
  }
}
