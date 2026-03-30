import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ReplicaManager, DatabaseNode, ReplicaMetrics } from '../database/ReplicaManager';
import { ConnectionPool, PoolMetrics } from '../database/ConnectionPool';
import { QueryRouter, RoutingStrategy } from '../database/QueryRouter';

export interface ShardingStrategy {
  name: string;
  type: 'hash' | 'range' | 'directory' | 'geo';
  tables: string[];
  shardKey: string;
  shardCount: number;
  description: string;
}

export interface PerformanceMetrics {
  avgQueryTime: number;
  p95QueryTime: number;
  p99QueryTime: number;
  queriesPerSecond: number;
  slowQueryCount: number;
  cacheHitRate: number;
  replicationLag: number;
  indexHealthScore: number;
  timestamp: Date;
}

export interface OptimizationReport {
  timestamp: Date;
  poolMetrics: PoolMetrics;
  replicaMetrics: ReplicaMetrics[];
  performanceMetrics: PerformanceMetrics;
  activeShardingStrategies: ShardingStrategy[];
  recommendations: string[];
  healthScore: number; // 0-100
}

@Injectable()
export class DatabaseOptimizationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseOptimizationService.name);
  private monitoringInterval: NodeJS.Timeout | null = null;
  private readonly MONITORING_INTERVAL = 60000; // 60 seconds
  private shardingStrategies: Map<string, ShardingStrategy> = new Map();
  private queryMetrics: Array<{ timestamp: Date; duration: number }> = [];
  private slowQueryThreshold = 1000; // 1 second
  private replicationLagHistory: number[] = [];

  constructor(
    private readonly replicaManager: ReplicaManager,
    private readonly connectionPool: ConnectionPool,
    private readonly queryRouter: QueryRouter,
  ) {}

  onModuleInit() {
    this.logger.log('Initializing Database Optimization Service');
    this.initializeDefaultShardingStrategies();
    this.startMonitoring();
  }

  onModuleDestroy() {
    this.stopMonitoring();
    this.logger.log('Database Optimization Service destroyed');
  }

  /**
   * Initialize default sharding strategies.
   */
  private initializeDefaultShardingStrategies(): void {
    // Hash-based sharding for user data
    this.shardingStrategies.set('hash-users', {
      name: 'Hash-based User Sharding',
      type: 'hash',
      tables: ['users', 'user_profiles'],
      shardKey: 'user_id',
      shardCount: 8,
      description: 'Distributes user data across 8 shards using hash of user_id',
    });

    // Range-based sharding for timestamped data
    this.shardingStrategies.set('range-events', {
      name: 'Range-based Event Sharding',
      type: 'range',
      tables: ['events', 'logs'],
      shardKey: 'created_at',
      shardCount: 12,
      description: 'Distributes time-series data across 12 shards by date ranges',
    });

    // Directory-based sharding for geographic distribution
    this.shardingStrategies.set('directory-geo', {
      name: 'Directory-based Geographic Sharding',
      type: 'directory',
      tables: ['user_locations', 'regional_data'],
      shardKey: 'region',
      shardCount: 4,
      description: 'Routes regional data to geographic-specific shards',
    });

    this.logger.log('Default sharding strategies initialized');
  }

  /**
   * Start periodic monitoring and optimization.
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.optimizeDatabase();
    }, this.MONITORING_INTERVAL);

    this.logger.log(`Database monitoring started (interval: ${this.MONITORING_INTERVAL}ms)`);
  }

  /**
   * Stop monitoring.
   */
  private stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Orchestrates the overall database optimization strategy.
   */
  optimizeDatabase(): void {
    this.logger.log('Performing periodic database optimization');

    // Monitor connection pool health
    const poolHealth = this.connectionPool.monitorPoolHealth();
    const poolLoadFactor = poolHealth.utilization;
    this.connectionPool.optimizePool(poolLoadFactor);

    // Check replica health
    const replicaMetrics = this.replicaManager.getAllReplicaMetrics();
    const healthyReplicaCount = replicaMetrics.filter((m) => m.status === 'online').length;

    // Update replication lag history
    const avgLag = replicaMetrics.reduce((sum, m) => sum + m.replicationLagMs, 0) / 
      Math.max(replicaMetrics.length, 1);
    this.replicationLagHistory.push(avgLag);
    if (this.replicationLagHistory.length > 60) {
      this.replicationLagHistory.shift();
    }

    // Adjust routing strategy based on conditions
    this.optimizeRoutingStrategy(poolHealth, replicaMetrics);

    const report = this.generateOptimizationReport();
    this.logger.info(
      `Database optimized - Pool: ${poolHealth.activeConnections}/${poolHealth.idleConnections}, ` +
      `Replicas: ${healthyReplicaCount}/${replicaMetrics.length}, ` +
      `Health: ${report.healthScore}%`,
    );
  }

  /**
   * Optimize routing strategy based on current conditions.
   */
  private optimizeRoutingStrategy(poolHealth: PoolMetrics, replicaMetrics: ReplicaMetrics[]): void {
    const utilization = poolHealth.utilization;
    const avgReplicationLag = replicaMetrics.reduce((sum, m) => sum + m.replicationLagMs, 0) / 
      Math.max(replicaMetrics.length, 1);

    let newStrategy: RoutingStrategy = 'weighted-load';

    // If replication lag is high, prefer latency-aware routing
    if (avgReplicationLag > 2000) {
      newStrategy = 'latency-aware';
      this.logger.warn(`High replication lag detected (${avgReplicationLag}ms), switching to latency-aware routing`);
    }
    // If load is very high, use least connections to avoid bottlenecks
    else if (utilization > 80) {
      newStrategy = 'least-connections';
      this.logger.warn(`High pool utilization detected (${utilization.toFixed(2)}%), switching to least-connections routing`);
    }
    // If everything is healthy, use weighted load balancing
    else {
      newStrategy = 'weighted-load';
    }

    this.queryRouter.setRoutingStrategy(newStrategy);
  }

  /**
   * Selects the appropriate database node for a SQL query.
   */
  getBestNode(sql: string): DatabaseNode {
    const decision = this.queryRouter.routeQueryWithPlan(sql);
    return decision.targetNode;
  }

  /**
   * Record query execution metrics.
   */
  recordQueryMetric(duration: number): void {
    this.queryMetrics.push({ timestamp: new Date(), duration });

    // Keep only last hour of metrics
    const oneHourAgo = Date.now() - 3600000;
    this.queryMetrics = this.queryMetrics.filter(
      (m) => m.timestamp.getTime() > oneHourAgo,
    );
  }

  /**
   * Analyze database performance and suggest optimizations.
   */
  analyzePerformance(): PerformanceMetrics {
    this.logger.log('Performing database performance analysis');

    const metrics = this.calculatePerformanceMetrics();

    // Log recommendations
    if (metrics.p99QueryTime > 5000) {
      this.logger.warn(`P99 query time is high: ${metrics.p99QueryTime}ms. Consider indexing or sharding.`);
    }
    if (metrics.cacheHitRate < 0.7) {
      this.logger.warn(`Cache hit rate is low: ${(metrics.cacheHitRate * 100).toFixed(2)}%. Review cache strategy.`);
    }

    return metrics;
  }

  /**
   * Calculate performance metrics from query history.
   */
  private calculatePerformanceMetrics(): PerformanceMetrics {
    if (this.queryMetrics.length === 0) {
      return {
        avgQueryTime: 0,
        p95QueryTime: 0,
        p99QueryTime: 0,
        queriesPerSecond: 0,
        slowQueryCount: 0,
        cacheHitRate: 0.85,
        replicationLag: this.replicationLagHistory.length > 0 
          ? this.replicationLagHistory[this.replicationLagHistory.length - 1] 
          : 0,
        indexHealthScore: 100,
        timestamp: new Date(),
      };
    }

    const durations = this.queryMetrics.map((m) => m.duration).sort((a, b) => a - b);
    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const p95Index = Math.ceil(durations.length * 0.95) - 1;
    const p99Index = Math.ceil(durations.length * 0.99) - 1;

    const slowQueryCount = durations.filter((d) => d > this.slowQueryThreshold).length;
    const queriesPerSecond = this.queryMetrics.length / 60; // Assuming 1-minute window

    return {
      avgQueryTime: Math.round(avgDuration),
      p95QueryTime: durations[Math.max(0, p95Index)],
      p99QueryTime: durations[Math.max(0, p99Index)],
      queriesPerSecond: Math.round(queriesPerSecond * 100) / 100,
      slowQueryCount,
      cacheHitRate: 0.85, // Simulated
      replicationLag: this.replicationLagHistory.length > 0 
        ? this.replicationLagHistory[this.replicationLagHistory.length - 1] 
        : 0,
      indexHealthScore: 100, // Simulated
      timestamp: new Date(),
    };
  }

  /**
   * Get all active sharding strategies.
   */
  getShardingStrategies(): ShardingStrategy[] {
    return Array.from(this.shardingStrategies.values());
  }

  /**
   * Get a specific sharding strategy.
   */
  getShardingStrategy(strategyId: string): ShardingStrategy | null {
    return this.shardingStrategies.get(strategyId) || null;
  }

  /**
   * Add a new sharding strategy.
   */
  configureSharding(strategyId: string, strategy: ShardingStrategy): void {
    this.shardingStrategies.set(strategyId, strategy);
    this.logger.log(
      `Sharding strategy configured: ${strategy.name} (type: ${strategy.type}, ` +
      `shards: ${strategy.shardCount}, tables: ${strategy.tables.join(', ')})`,
    );
  }

  /**
   * Calculate shard key for data distribution.
   */
  calculateShardId(shardKey: any, shardCount: number, shardType: 'hash' | 'range' = 'hash'): number {
    if (shardType === 'hash') {
      // Simple hash function
      const hash = String(shardKey)
        .split('')
        .reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0);
      return Math.abs(hash) % shardCount;
    } else if (shardType === 'range') {
      // Range-based (for numeric/date values)
      return Math.floor(Number(shardKey) % shardCount);
    }
    return 0;
  }

  /**
   * Generate comprehensive optimization report.
   */
  generateOptimizationReport(): OptimizationReport {
    const poolMetrics = this.connectionPool.getMetrics();
    const replicaMetrics = this.replicaManager.getAllReplicaMetrics();
    const performanceMetrics = this.calculatePerformanceMetrics();
    const shardingStrategies = this.getShardingStrategies();

    // Calculate health score (0-100)
    let healthScore = 100;
    if (poolMetrics.utilization > 80) healthScore -= 10;
    if (poolMetrics.utilization > 90) healthScore -= 10;
    if (performanceMetrics.p99QueryTime > 5000) healthScore -= 15;
    if (replicaMetrics.some((m) => m.status === 'offline')) healthScore -= 20;
    if (performanceMetrics.cacheHitRate < 0.7) healthScore -= 10;

    const recommendations: string[] = [];
    if (poolMetrics.utilization > 80) {
      recommendations.push('Increase connection pool size or add more replicas');
    }
    if (performanceMetrics.p99QueryTime > 5000) {
      recommendations.push('Review slow queries and add appropriate indices');
    }
    if (performanceMetrics.cacheHitRate < 0.7) {
      recommendations.push('Optimize cache strategy or increase cache size');
    }
    if (replicaMetrics.some((m) => m.replicationLagMs > 2000)) {
      recommendations.push('Monitor replication lag and optimize network or storage');
    }

    return {
      timestamp: new Date(),
      poolMetrics,
      replicaMetrics,
      performanceMetrics,
      activeShardingStrategies: shardingStrategies,
      recommendations,
      healthScore: Math.max(0, Math.min(100, healthScore)),
    };
  }

  /**
   * Get optimization report in JSON format.
   */
  getOptimizationReport(): OptimizationReport {
    return this.generateOptimizationReport();
  }

  /**
   * Set slow query threshold in milliseconds.
   */
  setSlowQueryThreshold(thresholdMs: number): void {
    this.slowQueryThreshold = thresholdMs;
    this.logger.log(`Slow query threshold set to ${thresholdMs}ms`);
  }

  /**
   * Clear collected metrics.
   */
  clearMetrics(): void {
    this.queryMetrics = [];
    this.replicationLagHistory = [];
    this.queryRouter.resetHistory();
    this.logger.log('Metrics cleared');
  }
}
