import { Injectable, Logger } from '@nestjs/common';
import { ReplicaManager, DatabaseNode } from './ReplicaManager';

export type RoutingStrategy = 'round-robin' | 'least-connections' | 'weighted-load' | 'latency-aware';

export interface RoutingDecision {
  targetNode: DatabaseNode;
  strategy: RoutingStrategy;
  reason: string;
  timestamp: Date;
}

export interface QueryPlan {
  sql: string;
  type: 'read' | 'write';
  priority: 'high' | 'normal' | 'low';
  cacheEligible: boolean;
  estimatedComplexity: number;
}

@Injectable()
export class QueryRouter {
  private readonly logger = new Logger(QueryRouter.name);
  private roundRobinIndex = 0;
  private routingStrategy: RoutingStrategy = 'weighted-load';
  private routingHistory: RoutingDecision[] = [];
  private readonly MAX_HISTORY_SIZE = 10000;
  private masterNode: DatabaseNode = {
    host: 'db-master',
    port: 5432,
    role: 'master',
    status: 'online',
  };

  constructor(private readonly replicaManager: ReplicaManager) {}

  /**
   * Routes a query to the appropriate database node based on its type and load.
   */
  routeQuery(queryType: 'read' | 'write'): DatabaseNode {
    if (queryType === 'write') {
      this.logger.debug('Routing write query to master node');
      this.recordRoutingDecision(this.masterNode, 'round-robin', 'Write queries always use master');
      return this.masterNode;
    }

    const availableReplicas = this.replicaManager.getAvailableReplicas();

    if (availableReplicas.length === 0) {
      this.logger.warn('No replicas available for read query, routing to master');
      this.recordRoutingDecision(this.masterNode, this.routingStrategy, 'No healthy replicas');
      return this.masterNode;
    }

    const selectedReplica = this.selectReplicaByStrategy(availableReplicas);
    this.recordRoutingDecision(selectedReplica, this.routingStrategy, 
      `Selected via ${this.routingStrategy}`);
    return selectedReplica;
  }

  /**
   * Route query with full planning and optimization.
   */
  routeQueryWithPlan(sql: string, priority: 'high' | 'normal' | 'low' = 'normal'): RoutingDecision {
    const plan = this.analyzeQuery(sql);
    plan.priority = priority;

    const targetNode = plan.type === 'write' 
      ? this.masterNode 
      : this.selectBestReplicaForQuery(plan);

    const decision: RoutingDecision = {
      targetNode,
      strategy: this.routingStrategy,
      reason: `Query type: ${plan.type}, Cache eligible: ${plan.cacheEligible}, Complexity: ${plan.estimatedComplexity}`,
      timestamp: new Date(),
    };

    this.recordRoutingDecision(targetNode, this.routingStrategy, decision.reason);
    return decision;
  }

  /**
   * Select replica using the configured strategy.
   */
  private selectReplicaByStrategy(availableReplicas: DatabaseNode[]): DatabaseNode {
    switch (this.routingStrategy) {
      case 'round-robin':
        return this.selectByRoundRobin(availableReplicas);
      case 'least-connections':
        return this.selectByLeastConnections(availableReplicas);
      case 'weighted-load':
        return this.selectByWeightedLoad(availableReplicas);
      case 'latency-aware':
        return this.selectByLatencyAware(availableReplicas);
      default:
        return this.selectByRoundRobin(availableReplicas);
    }
  }

  /**
   * Round-robin load balancing.
   */
  private selectByRoundRobin(availableReplicas: DatabaseNode[]): DatabaseNode {
    const selectedReplica = availableReplicas[this.roundRobinIndex % availableReplicas.length];
    this.roundRobinIndex++;
    this.logger.debug(`Selected via round-robin: ${selectedReplica.host}`);
    return selectedReplica;
  }

  /**
   * Least connections load balancing.
   */
  private selectByLeastConnections(availableReplicas: DatabaseNode[]): DatabaseNode {
    const selectedReplica = availableReplicas.reduce((prev, current) => {
      const prevConnections = prev.loadWeight || 0;
      const currentConnections = current.loadWeight || 0;
      return currentConnections < prevConnections ? current : prev;
    });
    this.logger.debug(`Selected via least-connections: ${selectedReplica.host}`);
    return selectedReplica;
  }

  /**
   * Weighted load-based selection.
   */
  private selectByWeightedLoad(availableReplicas: DatabaseNode[]): DatabaseNode {
    const totalWeight = availableReplicas.reduce((sum, replica) => 
      sum + (replica.loadWeight || 1), 0);
    
    let random = Math.random() * totalWeight;
    
    for (const replica of availableReplicas) {
      random -= (replica.loadWeight || 1);
      if (random <= 0) {
        this.logger.debug(`Selected via weighted-load: ${replica.host}`);
        return replica;
      }
    }
    
    return availableReplicas[0];
  }

  /**
   * Latency-aware selection (replication lag).
   */
  private selectByLatencyAware(availableReplicas: DatabaseNode[]): DatabaseNode {
    const selectedReplica = availableReplicas.reduce((best, current) => {
      const bestLag = best.replicationLag || Infinity;
      const currentLag = current.replicationLag || Infinity;
      return currentLag < bestLag ? current : best;
    });
    this.logger.debug(`Selected via latency-aware: ${selectedReplica.host} (lag: ${selectedReplica.replicationLag}ms)`);
    return selectedReplica;
  }

  /**
   * Select best replica for a specific query plan.
   */
  private selectBestReplicaForQuery(plan: QueryPlan): DatabaseNode {
    const availableReplicas = this.replicaManager.getAvailableReplicas();

    if (availableReplicas.length === 0) {
      return this.masterNode;
    }

    // For high-priority queries, use lowest latency
    if (plan.priority === 'high') {
      return this.selectByLatencyAware(availableReplicas);
    }

    // For complex queries, distribute based on load
    if (plan.estimatedComplexity > 5) {
      return this.selectByWeightedLoad(availableReplicas);
    }

    // Default to weighted load
    return this.selectByWeightedLoad(availableReplicas);
  }

  /**
   * Analyze query and create a query plan.
   */
  analyzeQuery(sql: string): QueryPlan {
    const type = this.determineQueryType(sql);
    const cacheEligible = this.isQueryCacheEligible(sql);
    const estimatedComplexity = this.estimateComplexity(sql);

    return {
      sql,
      type,
      priority: 'normal',
      cacheEligible,
      estimatedComplexity,
    };
  }

  /**
   * Determines the query type based on its SQL statement.
   */
  determineQueryType(sql: string): 'read' | 'write' {
    const readKeywords = ['SELECT', 'WITH', 'SHOW', 'DESCRIBE', 'EXPLAIN'];
    const writeKeywords = ['INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER', 'TRUNCATE'];

    const uppercaseSql = sql.trim().toUpperCase();

    for (const keyword of writeKeywords) {
      if (uppercaseSql.startsWith(keyword)) return 'write';
    }

    for (const keyword of readKeywords) {
      if (uppercaseSql.startsWith(keyword)) return 'read';
    }

    return 'write'; // Default to write for safety
  }

  /**
   * Determine if a query is eligible for caching.
   */
  private isQueryCacheEligible(sql: string): boolean {
    const nonCacheablePatterns = [
      /CURRENT_TIMESTAMP/i,
      /NOW\(\)/i,
      /RAND\(\)/i,
      /RANDOM\(\)/i,
      /::regclass/i,
    ];

    return !nonCacheablePatterns.some((pattern) => pattern.test(sql));
  }

  /**
   * Estimate query complexity based on SQL structure.
   */
  private estimateComplexity(sql: string): number {
    let complexity = 1;
    const upperSql = sql.toUpperCase();

    // Factor in JOIN complexity
    const joinCount = (upperSql.match(/JOIN/g) || []).length;
    complexity += joinCount * 2;

    // Factor in subquery complexity
    const subqueryCount = (upperSql.match(/SELECT/g) || []).length - 1;
    complexity += subqueryCount * 3;

    // Factor in GROUP BY complexity
    if (upperSql.includes('GROUP BY')) complexity += 2;

    // Factor in ORDER BY complexity
    if (upperSql.includes('ORDER BY')) complexity += 1;

    // Factor in aggregate functions
    const aggregates = (upperSql.match(/COUNT\(|SUM\(|AVG\(|MAX\(|MIN\(/g) || []).length;
    complexity += aggregates;

    return Math.min(complexity, 10); // Max complexity score of 10
  }

  /**
   * Set the routing strategy.
   */
  setRoutingStrategy(strategy: RoutingStrategy): void {
    this.routingStrategy = strategy;
    this.logger.log(`Routing strategy changed to: ${strategy}`);
  }

  /**
   * Get current routing strategy.
   */
  getRoutingStrategy(): RoutingStrategy {
    return this.routingStrategy;
  }

  /**
   * Record routing decision for analytics.
   */
  private recordRoutingDecision(
    node: DatabaseNode,
    strategy: RoutingStrategy,
    reason: string,
  ): void {
    const decision: RoutingDecision = {
      targetNode: node,
      strategy,
      reason,
      timestamp: new Date(),
    };
    this.routingHistory.push(decision);

    // Keep history size manageable
    if (this.routingHistory.length > this.MAX_HISTORY_SIZE) {
      this.routingHistory = this.routingHistory.slice(-this.MAX_HISTORY_SIZE);
    }
  }

  /**
   * Get routing history for analysis.
   */
  getRoutingHistory(limit: number = 100): RoutingDecision[] {
    return this.routingHistory.slice(-limit);
  }

  /**
   * Get routing statistics.
   */
  getRoutingStats(): Record<string, number> {
    const stats: Record<string, number> = {};

    for (const decision of this.routingHistory) {
      const key = decision.targetNode.host;
      stats[key] = (stats[key] || 0) + 1;
    }

    return stats;
  }

  /**
   * Reset routing history.
   */
  resetHistory(): void {
    this.routingHistory = [];
    this.roundRobinIndex = 0;
    this.logger.log('Routing history reset');
  }
}
