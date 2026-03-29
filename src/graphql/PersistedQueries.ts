import { Injectable, Logger } from '@nestjs/common';
import { DocumentNode, print } from 'graphql';

export interface PersistedQuery {
  id: string;
  hash: string;
  query: string;
  variables?: string;
  metadata: PersistedQueryMetadata;
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt?: Date;
  usageCount: number;
  isActive: boolean;
}

export interface PersistedQueryMetadata {
  name?: string;
  description?: string;
  tags?: string[];
  author?: string;
  version?: string;
  operationType?: 'query' | 'mutation' | 'subscription';
  complexity?: number;
  estimatedTime?: number;
  clientName?: string;
  clientVersion?: string;
}

export interface PersistedQueryStats {
  totalQueries: number;
  activeQueries: number;
  mostUsedQueries: Array<{
    id: string;
    name?: string;
    usageCount: number;
    lastUsedAt: Date;
  }>;
  recentlyAdded: PersistedQuery[];
  queriesByClient: Record<string, number>;
  queriesByOperationType: Record<string, number>;
}

export interface QueryValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  complexity?: number;
  estimatedTime?: number;
}

@Injectable()
export class PersistedQueries {
  private readonly logger = new Logger(PersistedQueries.name);
  private readonly queries = new Map<string, PersistedQuery>();
  private readonly hashToId = new Map<string, string>();
  private readonly queryStats = new Map<string, { count: number; lastUsed: Date }>();

  constructor() {
    this.initializeDefaultQueries();
  }

  private initializeDefaultQueries(): void {
    // Default persisted queries for common operations
    const defaultQueries: PersistedQuery[] = [
      {
        id: 'user_profile',
        hash: this.generateHash('query GetUserProfile($id: ID!) { user(id: $id) { id email firstName lastName profile { bio avatar } } }'),
        query: 'query GetUserProfile($id: ID!) { user(id: $id) { id email firstName lastName profile { bio avatar } } }',
        metadata: {
          name: 'Get User Profile',
          description: 'Retrieve user profile information',
          tags: ['user', 'profile'],
          operationType: 'query',
          complexity: 5,
          estimatedTime: 50,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        usageCount: 0,
        isActive: true,
      },
      {
        id: 'course_list',
        hash: this.generateHash('query GetCourses($limit: Int, $offset: Int) { courses(limit: $limit, offset: $offset) { id title description instructor { firstName lastName } } }'),
        query: 'query GetCourses($limit: Int, $offset: Int) { courses(limit: $limit, offset: $offset) { id title description instructor { firstName lastName } } }',
        metadata: {
          name: 'Get Courses',
          description: 'Retrieve list of courses with pagination',
          tags: ['course', 'list'],
          operationType: 'query',
          complexity: 15,
          estimatedTime: 100,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        usageCount: 0,
        isActive: true,
      },
      {
        id: 'assignments_for_course',
        hash: this.generateHash('query GetAssignmentsForCourse($courseId: ID!) { course(id: $courseId) { id title assignments { id title dueDate status } } }'),
        query: 'query GetAssignmentsForCourse($courseId: ID!) { course(id: $courseId) { id title assignments { id title dueDate status } } }',
        metadata: {
          name: 'Get Assignments for Course',
          description: 'Retrieve all assignments for a specific course',
          tags: ['course', 'assignment'],
          operationType: 'query',
          complexity: 20,
          estimatedTime: 150,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        usageCount: 0,
        isActive: true,
      },
    ];

    defaultQueries.forEach(query => {
      this.queries.set(query.id, query);
      this.hashToId.set(query.hash, query.id);
    });

    this.logger.debug(`Initialized ${defaultQueries.length} default persisted queries`);
  }

  async createPersistedQuery(
    query: string,
    metadata: PersistedQueryMetadata,
    variables?: string,
  ): Promise<PersistedQuery> {
    const hash = this.generateHash(query);
    
    // Check if query already exists
    const existingId = this.hashToId.get(hash);
    if (existingId) {
      const existing = this.queries.get(existingId)!;
      this.logger.debug(`Query already exists: ${existingId}`);
      return existing;
    }

    // Validate the query
    const validation = await this.validateQuery(query);
    if (!validation.isValid) {
      throw new Error(`Invalid query: ${validation.errors.join(', ')}`);
    }

    const persistedQuery: PersistedQuery = {
      id: this.generateQueryId(),
      hash,
      query,
      variables,
      metadata: {
        ...metadata,
        complexity: validation.complexity,
        estimatedTime: validation.estimatedTime,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0,
      isActive: true,
    };

    this.queries.set(persistedQuery.id, persistedQuery);
    this.hashToId.set(hash, persistedQuery.id);

    this.logger.debug(`Persisted query created: ${persistedQuery.id}`);
    
    return persistedQuery;
  }

  async getPersistedQuery(id: string): Promise<PersistedQuery | null> {
    const query = this.queries.get(id);
    
    if (query && query.isActive) {
      // Update usage statistics
      query.usageCount++;
      query.lastUsedAt = new Date();
      query.updatedAt = new Date();
      
      this.queryStats.set(id, {
        count: query.usageCount,
        lastUsed: query.lastUsedAt!,
      });
    }

    return query || null;
  }

  async getPersistedQueryByHash(hash: string): Promise<PersistedQuery | null> {
    const id = this.hashToId.get(hash);
    if (!id) {
      return null;
    }

    return this.getPersistedQuery(id);
  }

  async updatePersistedQuery(
    id: string,
    updates: Partial<PersistedQuery>,
  ): Promise<PersistedQuery> {
    const existing = this.queries.get(id);
    if (!existing) {
      throw new Error(`Persisted query not found: ${id}`);
    }

    // If query is being updated, re-hash it
    if (updates.query && updates.query !== existing.query) {
      const newHash = this.generateHash(updates.query);
      
      // Remove old hash mapping
      this.hashToId.delete(existing.hash);
      
      // Check for conflicts
      const conflictId = this.hashToId.get(newHash);
      if (conflictId && conflictId !== id) {
        throw new Error('Query with same hash already exists');
      }

      // Validate new query
      const validation = await this.validateQuery(updates.query);
      if (!validation.isValid) {
        throw new Error(`Invalid query: ${validation.errors.join(', ')}`);
      }

      updates.hash = newHash;
      updates.metadata = {
        ...updates.metadata,
        complexity: validation.complexity,
        estimatedTime: validation.estimatedTime,
      };
    }

    const updatedQuery: PersistedQuery = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };

    this.queries.set(id, updatedQuery);
    
    if (updates.hash) {
      this.hashToId.set(updates.hash, id);
    }

    this.logger.debug(`Persisted query updated: ${id}`);
    
    return updatedQuery;
  }

  async deletePersistedQuery(id: string): Promise<void> {
    const query = this.queries.get(id);
    if (!query) {
      throw new Error(`Persisted query not found: ${id}`);
    }

    this.queries.delete(id);
    this.hashToId.delete(query.hash);
    this.queryStats.delete(id);

    this.logger.debug(`Persisted query deleted: ${id}`);
  }

  async deactivatePersistedQuery(id: string): Promise<void> {
    const query = this.queries.get(id);
    if (!query) {
      throw new Error(`Persisted query not found: ${id}`);
    }

    query.isActive = false;
    query.updatedAt = new Date();

    this.logger.debug(`Persisted query deactivated: ${id}`);
  }

  async activatePersistedQuery(id: string): Promise<void> {
    const query = this.queries.get(id);
    if (!query) {
      throw new Error(`Persisted query not found: ${id}`);
    }

    query.isActive = true;
    query.updatedAt = new Date();

    this.logger.debug(`Persisted query activated: ${id}`);
  }

  async listPersistedQueries(options?: {
    limit?: number;
    offset?: number;
    tags?: string[];
    operationType?: string;
    author?: string;
    isActive?: boolean;
  }): Promise<{ queries: PersistedQuery[]; total: number }> {
    let queries = Array.from(this.queries.values());

    // Apply filters
    if (options?.tags?.length) {
      queries = queries.filter(query => 
        query.metadata.tags?.some(tag => options.tags!.includes(tag))
      );
    }

    if (options?.operationType) {
      queries = queries.filter(query => 
        query.metadata.operationType === options.operationType
      );
    }

    if (options?.author) {
      queries = queries.filter(query => 
        query.metadata.author === options.author
      );
    }

    if (options?.isActive !== undefined) {
      queries = queries.filter(query => query.isActive === options.isActive);
    }

    // Sort by usage count (most used first)
    queries.sort((a, b) => b.usageCount - a.usageCount);

    const total = queries.length;

    // Apply pagination
    if (options?.limit) {
      const start = options.offset || 0;
      queries = queries.slice(start, start + options.limit);
    }

    return { queries, total };
  }

  async searchPersistedQueries(searchTerm: string): Promise<PersistedQuery[]> {
    const term = searchTerm.toLowerCase();
    return Array.from(this.queries.values()).filter(query => 
      query.metadata.name?.toLowerCase().includes(term) ||
      query.metadata.description?.toLowerCase().includes(term) ||
      query.query.toLowerCase().includes(term) ||
      query.metadata.tags?.some(tag => tag.toLowerCase().includes(term))
    );
  }

  async getPersistedQueryStats(): Promise<PersistedQueryStats> {
    const allQueries = Array.from(this.queries.values());
    const activeQueries = allQueries.filter(q => q.isActive);

    // Most used queries
    const mostUsedQueries = allQueries
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 10)
      .map(query => ({
        id: query.id,
        name: query.metadata.name,
        usageCount: query.usageCount,
        lastUsedAt: query.lastUsedAt || query.createdAt,
      }));

    // Recently added
    const recentlyAdded = allQueries
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10);

    // Queries by client
    const queriesByClient: Record<string, number> = {};
    allQueries.forEach(query => {
      const client = query.metadata.clientName || 'unknown';
      queriesByClient[client] = (queriesByClient[client] || 0) + 1;
    });

    // Queries by operation type
    const queriesByOperationType: Record<string, number> = {};
    allQueries.forEach(query => {
      const type = query.metadata.operationType || 'unknown';
      queriesByOperationType[type] = (queriesByOperationType[type] || 0) + 1;
    });

    return {
      totalQueries: allQueries.length,
      activeQueries: activeQueries.length,
      mostUsedQueries,
      recentlyAdded,
      queriesByClient,
      queriesByOperationType,
    };
  }

  async exportPersistedQueries(format: 'json' | 'graphql' | 'csv' = 'json'): Promise<string> {
    const queries = Array.from(this.queries.values());

    switch (format) {
      case 'json':
        return JSON.stringify(queries, null, 2);
      
      case 'graphql':
        return queries.map(q => `# ${q.metadata.name}\n# ${q.metadata.description}\n${q.query}`).join('\n\n');
      
      case 'csv':
        const headers = ['id', 'name', 'description', 'operationType', 'complexity', 'usageCount', 'createdAt'];
        const rows = queries.map(q => [
          q.id,
          q.metadata.name || '',
          q.metadata.description || '',
          q.metadata.operationType || '',
          q.metadata.complexity || 0,
          q.usageCount,
          q.createdAt.toISOString(),
        ]);
        
        return [headers, ...rows].map(row => row.join(',')).join('\n');
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  async importPersistedQueries(data: string, format: 'json' | 'graphql' = 'json'): Promise<number> {
    let queries: PersistedQuery[];

    switch (format) {
      case 'json':
        queries = JSON.parse(data);
        break;
      
      case 'graphql':
        // Parse GraphQL format (simplified)
        const queryBlocks = data.split('\n\n');
        queries = queryBlocks.map((block, index) => {
          const lines = block.split('\n');
          const nameLine = lines.find(line => line.startsWith('# ')) || '';
          const descriptionLine = lines.find(line => line.startsWith('# ')) || '';
          const queryLine = lines.find(line => !line.startsWith('#')) || '';
          
          return {
            id: `imported_${index}`,
            hash: this.generateHash(queryLine),
            query: queryLine,
            metadata: {
              name: nameLine.replace('# ', '').trim(),
              description: descriptionLine.replace('# ', '').trim(),
              operationType: queryLine.trim().startsWith('mutation') ? 'mutation' : 'query',
            },
            createdAt: new Date(),
            updatedAt: new Date(),
            usageCount: 0,
            isActive: true,
          };
        });
        break;
      
      default:
        throw new Error(`Unsupported import format: ${format}`);
    }

    let importedCount = 0;
    for (const query of queries) {
      try {
        await this.createPersistedQuery(query.query, query.metadata, query.variables);
        importedCount++;
      } catch (error) {
        this.logger.warn(`Failed to import query: ${error.message}`);
      }
    }

    this.logger.info(`Imported ${importedCount} persisted queries`);
    return importedCount;
  }

  private generateHash(query: string): string {
    // Simple hash generation (in production, use a proper hashing algorithm)
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
      const char = query.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private generateQueryId(): string {
    return `pq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async validateQuery(query: string): Promise<QueryValidationResult> {
    // Simplified validation (in production, use proper GraphQL validation)
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Basic syntax check
      if (!query.trim()) {
        errors.push('Query cannot be empty');
      }

      // Check for GraphQL keywords
      const graphqlKeywords = ['query', 'mutation', 'subscription', '{', '}', '(', ')'];
      const hasValidStructure = graphqlKeywords.some(keyword => query.includes(keyword));
      
      if (!hasValidStructure) {
        errors.push('Query does not appear to be a valid GraphQL query');
      }

      // Estimate complexity (simplified)
      const complexity = this.estimateComplexity(query);
      const estimatedTime = complexity * 10; // 10ms per complexity point

      if (complexity > 200) {
        warnings.push('Query has high complexity, consider optimization');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        complexity,
        estimatedTime,
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [error.message],
        warnings: [],
      };
    }
  }

  private estimateComplexity(query: string): number {
    // Simplified complexity estimation
    let complexity = 1;

    // Add complexity for each field
    const fields = query.match(/\w+\s*{/g) || [];
    complexity += fields.length * 2;

    // Add complexity for nested fields
    const nesting = (query.match(/{/g) || []).length;
    complexity += nesting * 5;

    // Add complexity for list fields
    const listFields = query.match(/\w+s\s*{/g) || [];
    complexity += listFields.length * 10;

    return complexity;
  }

  async cleanupUnusedQueries(daysUnused: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysUnused);

    const unusedQueries = Array.from(this.queries.values()).filter(query => 
      (!query.lastUsedAt || query.lastUsedAt < cutoffDate) && 
      query.usageCount < 5 &&
      query.isActive
    );

    for (const query of unusedQueries) {
      await this.deactivatePersistedQuery(query.id);
    }

    this.logger.info(`Deactivated ${unusedQueries.length} unused persisted queries`);
    return unusedQueries.length;
  }

  async getQueryUsageAnalytics(timeRange: { start: Date; end: Date }): Promise<any> {
    const usageData = Array.from(this.queryStats.entries())
      .filter(([, stats]) => stats.lastUsed >= timeRange.start && stats.lastUsed <= timeRange.end)
      .map(([id, stats]) => {
        const query = this.queries.get(id);
        return {
          id,
          name: query?.metadata.name,
          usageCount: stats.count,
          lastUsed: stats.lastUsed,
          complexity: query?.metadata.complexity,
          operationType: query?.metadata.operationType,
        };
      })
      .sort((a, b) => b.usageCount - a.usageCount);

    return {
      timeRange,
      totalUsage: usageData.reduce((sum, item) => sum + item.usageCount, 0),
      uniqueQueries: usageData.length,
      topQueries: usageData.slice(0, 10),
      usageByOperationType: this.groupBy(usageData, 'operationType'),
      usageByComplexity: this.groupByComplexity(usageData),
      generatedAt: new Date(),
    };
  }

  private groupBy<T>(array: T[], key: keyof T): Record<string, number> {
    return array.reduce((groups, item) => {
      const group = String(item[key]);
      groups[group] = (groups[group] || 0) + 1;
      return groups;
    }, {} as Record<string, number>);
  }

  private groupByComplexity(usageData: any[]): Record<string, number> {
    return usageData.reduce((groups, item) => {
      const complexity = item.complexity || 0;
      let range = 'low';
      if (complexity > 100) range = 'high';
      else if (complexity > 50) range = 'medium';
      
      groups[range] = (groups[range] || 0) + 1;
      return groups;
    }, {} as Record<string, number>);
  }
}
