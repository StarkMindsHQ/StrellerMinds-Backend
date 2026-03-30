import { Injectable, Logger } from '@nestjs/common';

export interface DatabaseNode {
  host: string;
  port: number;
  role: 'master' | 'replica';
  status: 'online' | 'offline';
  loadWeight?: number;
  replicationLag?: number;
  maxConnections?: number;
}

export interface ReplicaMetrics {
  replicaHost: string;
  status: 'online' | 'offline';
  replicationLagMs: number;
  activeConnections: number;
  requestCount: number;
  errorRate: number;
  lastHealthCheck: Date;
  averageResponseTime: number;
}

@Injectable()
export class ReplicaManager {
  private readonly logger = new Logger(ReplicaManager.name);
  private replicas: DatabaseNode[] = [];
  private metrics: Map<string, ReplicaMetrics> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
  private readonly MAX_REPLICATION_LAG = 5000; // 5 seconds

  constructor() {
    this.initializeReplicas();
  }

  private initializeReplicas() {
    this.logger.log('Initializing database read replicas');
    
    // In a real environment, these would come from configuration or environment variables
    this.replicas = [
      { 
        host: 'db-replica-1', 
        port: 5432, 
        role: 'replica', 
        status: 'online', 
        loadWeight: 1,
        replicationLag: 100,
        maxConnections: 100
      },
      { 
        host: 'db-replica-2', 
        port: 5432, 
        role: 'replica', 
        status: 'online', 
        loadWeight: 1,
        replicationLag: 150,
        maxConnections: 100
      },
    ];

    // Initialize metrics for each replica
    this.replicas.forEach((replica) => {
      this.metrics.set(replica.host, {
        replicaHost: replica.host,
        status: 'online',
        replicationLagMs: replica.replicationLag || 0,
        activeConnections: 0,
        requestCount: 0,
        errorRate: 0,
        lastHealthCheck: new Date(),
        averageResponseTime: 0,
      });
    });

    this.startHealthChecks();
  }

  /**
   * Retrieves all available read replicas.
   */
  getAvailableReplicas(): DatabaseNode[] {
    return this.replicas.filter((replica) => replica.status === 'online');
  }

  /**
   * Get replica with lowest replication lag.
   */
  getOptimalReplica(): DatabaseNode | null {
    const available = this.getAvailableReplicas();
    if (available.length === 0) return null;

    return available.reduce((best, current) => {
      const bestLag = best.replicationLag || Infinity;
      const currentLag = current.replicationLag || Infinity;
      return currentLag < bestLag ? current : best;
    });
  }

  /**
   * Updates the status of a specific database node.
   */
  updateReplicaStatus(host: string, status: 'online' | 'offline'): void {
    const replica = this.replicas.find((r) => r.host === host);
    if (replica) {
      replica.status = status;
      const metrics = this.metrics.get(host);
      if (metrics) {
        metrics.status = status;
      }
      this.logger.warn(`Replica ${host} status changed to ${status}`);
    }
  }

  /**
   * Adds a new replica to the configuration.
   */
  addReplica(node: DatabaseNode): void {
    this.replicas.push(node);
    this.metrics.set(node.host, {
      replicaHost: node.host,
      status: 'online',
      replicationLagMs: node.replicationLag || 0,
      activeConnections: 0,
      requestCount: 0,
      errorRate: 0,
      lastHealthCheck: new Date(),
      averageResponseTime: 0,
    });
    this.logger.log(`Added new read replica: ${node.host}`);
  }

  /**
   * Update replication lag for a replica.
   */
  updateReplicationLag(host: string, lagMs: number): void {
    const replica = this.replicas.find((r) => r.host === host);
    const metrics = this.metrics.get(host);

    if (replica) {
      replica.replicationLag = lagMs;
    }
    if (metrics) {
      metrics.replicationLagMs = lagMs;

      // Mark replica as offline if lag exceeds threshold
      if (lagMs > this.MAX_REPLICATION_LAG) {
        this.logger.warn(`Replication lag for ${host} exceeds threshold: ${lagMs}ms`);
        this.updateReplicaStatus(host, 'offline');
      }
    }
  }

  /**
   * Record metrics for query execution on a replica.
   */
  recordQueryMetrics(host: string, responseTimeMs: number, success: boolean): void {
    const metrics = this.metrics.get(host);
    if (metrics) {
      metrics.requestCount++;
      const oldAvgTime = metrics.averageResponseTime;
      metrics.averageResponseTime = 
        (oldAvgTime * (metrics.requestCount - 1) + responseTimeMs) / metrics.requestCount;
      
      if (!success) {
        metrics.errorRate = (metrics.errorRate * (metrics.requestCount - 1) + 1) / metrics.requestCount;
      }
    }
  }

  /**
   * Get metrics for a specific replica.
   */
  getReplicaMetrics(host: string): ReplicaMetrics | null {
    return this.metrics.get(host) || null;
  }

  /**
   * Get all replica metrics.
   */
  getAllReplicaMetrics(): ReplicaMetrics[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Start periodic health checks.
   */
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.HEALTH_CHECK_INTERVAL);
  }

  /**
   * Perform health checks on all replicas.
   */
  private performHealthChecks(): void {
    this.replicas.forEach((replica) => {
      const metrics = this.metrics.get(replica.host);
      if (metrics) {
        metrics.lastHealthCheck = new Date();
        // In production, this would be an actual database health check
        this.logger.debug(`Health check for replica ${replica.host}: OK`);
      }
    });
  }

  /**
   * Remove a replica from configuration.
   */
  removeReplica(host: string): void {
    const index = this.replicas.findIndex((r) => r.host === host);
    if (index > -1) {
      this.replicas.splice(index, 1);
      this.metrics.delete(host);
      this.logger.log(`Removed replica: ${host}`);
    }
  }

  /**
   * Stop health checks and cleanup.
   */
  cleanup(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.logger.log('Replica health checks stopped');
    }
  }
}
