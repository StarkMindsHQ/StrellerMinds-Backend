import { Injectable, Logger } from '@nestjs/common';
import { ReplicaManager, DatabaseNode } from './ReplicaManager';

@Injectable()
export class QueryRouter {
  private readonly logger = new Logger(QueryRouter.name);
  private roundRobinIndex = 0;

  constructor(private readonly replicaManager: ReplicaManager) {}

  /**
   * Routes a query to the appropriate database node based on its type and load.
   */
  routeQuery(queryType: 'read' | 'write'): DatabaseNode {
    if (queryType === 'write') {
      this.logger.debug('Routing write query to master node');
      return { host: 'db-master', port: 5432, role: 'master', status: 'online' };
    }

    const availableReplicas = this.replicaManager.getAvailableReplicas();
    
    if (availableReplicas.length === 0) {
      this.logger.warn('No replicas available for read query, routing to master');
      return { host: 'db-master', port: 5432, role: 'master', status: 'online' };
    }

    // Select next replica using round-robin distribution
    const selectedReplica = availableReplicas[this.roundRobinIndex % availableReplicas.length];
    this.roundRobinIndex++;
    
    this.logger.debug(`Routing read query to replica: ${selectedReplica.host}`);
    return selectedReplica;
  }

  /**
   * Determines the query type based on its SQL statement.
   */
  determineQueryType(sql: string): 'read' | 'write' {
    const readKeywords = ['SELECT', 'WITH', 'SHOW', 'DESCRIBE'];
    const writeKeywords = ['INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER'];
    
    const uppercaseSql = sql.trim().toUpperCase();
    
    for (const keyword of writeKeywords) {
      if (uppercaseSql.startsWith(keyword)) return 'write';
    }

    for (const keyword of readKeywords) {
      if (uppercaseSql.startsWith(keyword)) return 'read';
    }

    return 'write'; // Default to write for safety
  }
}
