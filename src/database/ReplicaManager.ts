import { Injectable, Logger } from '@nestjs/common';

export interface DatabaseNode {
  host: string;
  port: number;
  role: 'master' | 'replica';
  status: 'online' | 'offline';
  loadWeight?: number;
}

@Injectable()
export class ReplicaManager {
  private readonly logger = new Logger(ReplicaManager.name);
  private replicas: DatabaseNode[] = [];

  constructor() {
    this.initializeReplicas();
  }

  private initializeReplicas() {
    this.logger.log('Initializing database read replicas');
    
    // In a real environment, these would come from configuration or environment variables
    this.replicas = [
      { host: 'db-replica-1', port: 5432, role: 'replica', status: 'online', loadWeight: 1 },
      { host: 'db-replica-2', port: 5432, role: 'replica', status: 'online', loadWeight: 1 },
    ];
  }

  /**
   * Retrieves all available read replicas.
   */
  getAvailableReplicas(): DatabaseNode[] {
    return this.replicas.filter((replica) => replica.status === 'online');
  }

  /**
   * Updates the status of a specific database node.
   */
  updateReplicaStatus(host: string, status: 'online' | 'offline'): void {
    const replica = this.replicas.find((r) => r.host === host);
    if (replica) {
      replica.status = status;
      this.logger.warn(`Replica ${host} status changed to ${status}`);
    }
  }

  /**
   * Adds a new replica to the configuration.
   */
  addReplica(node: DatabaseNode): void {
    this.replicas.push(node);
    this.logger.log(`Added new read replica: ${node.host}`);
  }
}
