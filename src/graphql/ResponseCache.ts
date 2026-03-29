import { Injectable, Logger } from '@nestjs/common';
import { DocumentNode, OperationDefinitionNode, print } from 'graphql';

export interface CacheKey {
  query: string;
  variables?: string;
  operationName?: string;
  context?: string;
}

export interface CacheEntry {
  key: string;
  data: any;
  metadata: CacheMetadata;
  createdAt: Date;
  lastAccessedAt: Date;
  expiresAt?: Date;
  hitCount: number;
}

export interface CacheMetadata {
  operationType: 'query' | 'mutation' | 'subscription';
  complexity: number;
  estimatedTime: number;
  tags?: string[];
  ttl?: number;
  maxAge?: number;
  staleWhileRevalidate?: number;
  vary?: string[];
}

export interface CacheStats {
  totalEntries: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  memoryUsage: number;
  entriesByOperationType: Record<string, number>;
  entriesByTag: Record<string, number>;
  expiredEntries: number;
  staleEntries: number;
}

export interface CacheInvalidationRule {
  type: 'TAG' | 'OPERATION' | 'TIME' | 'MANUAL';
  pattern: string;
  tags?: string[];
  operations?: string[];
  timeToLive?: number;
  isActive: boolean;
  createdAt: Date;
}

export interface CacheConfiguration {
  maxSize: number;
  defaultTtl: number;
  maxAge: number;
  cleanupInterval: number;
  enableMetrics: boolean;
  enableCompression: boolean;
  enableEncryption: boolean;
}

@Injectable()
export class ResponseCache {
  private readonly logger = new Logger(ResponseCache.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly invalidationRules = new Map<string, CacheInvalidationRule>();
  private readonly stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0,
  };

  private readonly config: CacheConfiguration = {
    maxSize: 1000,
    defaultTtl: 300000, // 5 minutes
    maxAge: 3600000, // 1 hour
    cleanupInterval: 60000, // 1 minute
    enableMetrics: true,
    enableCompression: false,
    enableEncryption: false,
  };

  constructor() {
    this.initializeDefaultInvalidationRules();
    this.startCleanupInterval();
  }

  private initializeDefaultInvalidationRules(): void {
    // Default invalidation rules
    
    // User-related queries should be invalidated when user data changes
    this.addInvalidationRule({
      type: 'TAG',
      pattern: 'user',
      tags: ['user', 'profile', 'auth'],
      isActive: true,
      createdAt: new Date(),
    });

    // Course-related queries
    this.addInvalidationRule({
      type: 'TAG',
      pattern: 'course',
      tags: ['course', 'lesson', 'assignment'],
      isActive: true,
      createdAt: new Date(),
    });

    // High-frequency queries with shorter TTL
    this.addInvalidationRule({
      type: 'TIME',
      pattern: 'high-frequency',
      timeToLive: 60000, // 1 minute
      isActive: true,
      createdAt: new Date(),
    });

    // Mutation operations should invalidate related queries
    this.addInvalidationRule({
      type: 'OPERATION',
      pattern: 'mutation-invalidation',
      operations: ['createUser', 'updateUser', 'deleteUser', 'createCourse', 'updateCourse'],
      isActive: true,
      createdAt: new Date(),
    });
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  async get(query: DocumentNode, variables?: any, context?: any): Promise<any | null> {
    const key = this.generateCacheKey(query, variables, context);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if entry is expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.evictions++;
      return null;
    }

    // Update access statistics
    entry.lastAccessedAt = new Date();
    entry.hitCount++;
    this.stats.hits++;

    this.logger.debug(`Cache hit for key: ${key}`);
    return entry.data;
  }

  async set(
    query: DocumentNode,
    data: any,
    variables?: any,
    context?: any,
    metadata?: Partial<CacheMetadata>,
  ): Promise<void> {
    const key = this.generateCacheKey(query, variables, context);
    const operation = this.getOperationType(query);

    // Don't cache mutations by default
    if (operation === 'mutation') {
      this.logger.debug('Skipping cache for mutation operation');
      return;
    }

    // Check cache size limit
    if (this.cache.size >= this.config.maxSize) {
      await this.evictLeastRecentlyUsed();
    }

    const cacheMetadata: CacheMetadata = {
      operationType: operation,
      complexity: this.estimateComplexity(query),
      estimatedTime: this.estimateTime(query),
      ttl: metadata?.ttl || this.config.defaultTtl,
      maxAge: metadata?.maxAge || this.config.maxAge,
      ...metadata,
    };

    const entry: CacheEntry = {
      key,
      data,
      metadata: cacheMetadata,
      createdAt: new Date(),
      lastAccessedAt: new Date(),
      expiresAt: new Date(Date.now() + (cacheMetadata.ttl || this.config.defaultTtl)),
      hitCount: 0,
    };

    this.cache.set(key, entry);
    this.stats.sets++;

    this.logger.debug(`Cache set for key: ${key}, TTL: ${cacheMetadata.ttl}ms`);
  }

  async invalidate(pattern?: string, tags?: string[]): Promise<number> {
    let invalidatedCount = 0;

    if (pattern) {
      // Invalidate by pattern (simple string matching)
      for (const [key, entry] of this.cache.entries()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
          invalidatedCount++;
        }
      }
    }

    if (tags?.length) {
      // Invalidate by tags
      for (const [key, entry] of this.cache.entries()) {
        if (entry.metadata.tags?.some(tag => tags.includes(tag))) {
          this.cache.delete(key);
          invalidatedCount++;
        }
      }
    }

    this.stats.deletes += invalidatedCount;
    this.logger.info(`Invalidated ${invalidatedCount} cache entries`);

    return invalidatedCount;
  }

  async invalidateByOperation(operations: string[]): Promise<number> {
    let invalidatedCount = 0;

    for (const operation of operations) {
      for (const [key, entry] of this.cache.entries()) {
        if (key.includes(operation)) {
          this.cache.delete(key);
          invalidatedCount++;
        }
      }
    }

    this.stats.deletes += invalidatedCount;
    this.logger.info(`Invalidated ${invalidatedCount} cache entries by operations: ${operations.join(', ')}`);

    return invalidatedCount;
  }

  async clear(): Promise<number> {
    const count = this.cache.size;
    this.cache.clear();
    this.stats.deletes += count;
    
    this.logger.info(`Cleared ${count} cache entries`);
    return count;
  }

  private generateCacheKey(query: DocumentNode, variables?: any, context?: any): string {
    const queryStr = print(query);
    const variablesStr = variables ? JSON.stringify(variables) : '';
    const contextStr = context ? JSON.stringify(context) : '';
    
    // Simple key generation (in production, use a proper hashing algorithm)
    const combined = `${queryStr}|${variablesStr}|${contextStr}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return hash.toString(36);
  }

  private getOperationType(query: DocumentNode): 'query' | 'mutation' | 'subscription' {
    const operation = query.definitions.find(
      (def): def is OperationDefinitionNode => def.kind === 'OperationDefinition'
    ) as OperationDefinitionNode;

    return operation?.operation || 'query';
  }

  private estimateComplexity(query: DocumentNode): number {
    // Simplified complexity estimation
    const queryStr = print(query);
    let complexity = 1;

    // Count fields
    const fields = queryStr.match(/\w+\s*{/g) || [];
    complexity += fields.length;

    // Count nesting
    const nesting = (queryStr.match(/{/g) || []).length;
    complexity += nesting * 2;

    return complexity;
  }

  private estimateTime(query: DocumentNode): number {
    const complexity = this.estimateComplexity(query);
    return complexity * 10; // 10ms per complexity point
  }

  private isExpired(entry: CacheEntry): boolean {
    if (!entry.expiresAt) {
      return false;
    }
    return Date.now() > entry.expiresAt.getTime();
  }

  private async evictLeastRecentlyUsed(): Promise<void> {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessedAt.getTime() < oldestTime) {
        oldestTime = entry.lastAccessedAt.getTime();
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
      this.logger.debug(`Evicted LRU cache entry: ${oldestKey}`);
    }
  }

  private cleanup(): void {
    let cleanedCount = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt && entry.expiresAt.getTime() < now) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.stats.evictions += cleanedCount;
      this.logger.debug(`Cleaned up ${cleanedCount} expired cache entries`);
    }
  }

  addInvalidationRule(rule: CacheInvalidationRule): void {
    const id = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.invalidationRules.set(id, rule);
    this.logger.debug(`Invalidation rule added: ${id}`);
  }

  removeInvalidationRule(id: string): void {
    this.invalidationRules.delete(id);
    this.logger.debug(`Invalidation rule removed: ${id}`);
  }

  getInvalidationRules(): CacheInvalidationRule[] {
    return Array.from(this.invalidationRules.values());
  }

  async applyInvalidationRules(operation: string, data?: any): Promise<void> {
    const activeRules = Array.from(this.invalidationRules.values()).filter(rule => rule.isActive);

    for (const rule of activeRules) {
      switch (rule.type) {
        case 'TAG':
          if (rule.tags?.length) {
            await this.invalidate(undefined, rule.tags);
          }
          break;

        case 'OPERATION':
          if (rule.operations?.includes(operation)) {
            await this.invalidateByRule(rule);
          }
          break;

        case 'TIME':
          // Time-based rules are handled during cleanup
          break;

        case 'MANUAL':
          // Manual rules require explicit trigger
          break;
      }
    }
  }

  private async invalidateByRule(rule: CacheInvalidationRule): Promise<void> {
    switch (rule.type) {
      case 'TAG':
        if (rule.tags?.length) {
          await this.invalidate(undefined, rule.tags);
        }
        break;

      case 'OPERATION':
        if (rule.operations?.length) {
          await this.invalidateByOperation(rule.operations);
        }
        break;

      case 'TIME':
        // Find entries older than timeToLive
        const cutoffTime = Date.now() - (rule.timeToLive || 0);
        let invalidatedCount = 0;

        for (const [key, entry] of this.cache.entries()) {
          if (entry.createdAt.getTime() < cutoffTime) {
            this.cache.delete(key);
            invalidatedCount++;
          }
        }

        if (invalidatedCount > 0) {
          this.stats.deletes += invalidatedCount;
          this.logger.info(`Invalidated ${invalidatedCount} entries by time rule: ${rule.pattern}`);
        }
        break;
    }
  }

  async getCacheStats(): Promise<CacheStats> {
    const entries = Array.from(this.cache.values());
    const expiredEntries = entries.filter(entry => this.isExpired(entry));
    const staleEntries = entries.filter(entry => {
      const age = Date.now() - entry.createdAt.getTime();
      const maxAge = entry.metadata.maxAge || this.config.maxAge;
      return age > maxAge;
    });

    const entriesByOperationType: Record<string, number> = {};
    const entriesByTag: Record<string, number> = {};

    entries.forEach(entry => {
      // Count by operation type
      const opType = entry.metadata.operationType;
      entriesByOperationType[opType] = (entriesByOperationType[opType] || 0) + 1;

      // Count by tags
      if (entry.metadata.tags) {
        entry.metadata.tags.forEach(tag => {
          entriesByTag[tag] = (entriesByTag[tag] || 0) + 1;
        });
      }
    });

    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;

    // Estimate memory usage (rough calculation)
    const memoryUsage = entries.reduce((total, entry) => {
      const dataSize = JSON.stringify(entry.data).length;
      return total + dataSize;
    }, 0);

    return {
      totalEntries: entries.length,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      memoryUsage,
      entriesByOperationType,
      entriesByTag,
      expiredEntries: expiredEntries.length,
      staleEntries: staleEntries.length,
    };
  }

  async getCacheEntries(options?: {
    limit?: number;
    offset?: number;
    operationType?: string;
    tags?: string[];
  }): Promise<CacheEntry[]> {
    let entries = Array.from(this.cache.values());

    // Apply filters
    if (options?.operationType) {
      entries = entries.filter(entry => entry.metadata.operationType === options.operationType);
    }

    if (options?.tags?.length) {
      entries = entries.filter(entry => 
        entry.metadata.tags?.some(tag => options.tags!.includes(tag))
      );
    }

    // Sort by last accessed time (most recent first)
    entries.sort((a, b) => b.lastAccessedAt.getTime() - a.lastAccessedAt.getTime());

    // Apply pagination
    if (options?.limit) {
      const start = options.offset || 0;
      entries = entries.slice(start, start + options.limit);
    }

    return entries;
  }

  async warmup(queries: Array<{ query: DocumentNode; variables?: any; context?: any }>): Promise<number> {
    let warmedUpCount = 0;

    for (const { query, variables, context } of queries) {
      const key = this.generateCacheKey(query, variables, context);
      
      if (!this.cache.has(key)) {
        // Create a placeholder entry to indicate it should be warmed up
        // In a real implementation, you would execute the query and cache the result
        const entry: CacheEntry = {
          key,
          data: null, // Would be populated with actual query result
          metadata: {
            operationType: this.getOperationType(query),
            complexity: this.estimateComplexity(query),
            estimatedTime: this.estimateTime(query),
            tags: ['warmup'],
          },
          createdAt: new Date(),
          lastAccessedAt: new Date(),
          expiresAt: new Date(Date.now() + this.config.defaultTtl),
          hitCount: 0,
        };

        this.cache.set(key, entry);
        warmedUpCount++;
      }
    }

    this.logger.info(`Warmed up ${warmedUpCount} cache entries`);
    return warmedUpCount;
  }

  updateConfiguration(updates: Partial<CacheConfiguration>): void {
    Object.assign(this.config, updates);
    this.logger.debug('Cache configuration updated');
  }

  getConfiguration(): CacheConfiguration {
    return { ...this.config };
  }

  async exportCacheData(format: 'json' | 'csv' = 'json'): Promise<string> {
    const entries = Array.from(this.cache.values());

    switch (format) {
      case 'json':
        return JSON.stringify(entries, null, 2);
      
      case 'csv':
        const headers = ['key', 'operationType', 'complexity', 'hitCount', 'createdAt', 'lastAccessedAt', 'expiresAt'];
        const rows = entries.map(entry => [
          entry.key,
          entry.metadata.operationType,
          entry.metadata.complexity,
          entry.hitCount,
          entry.createdAt.toISOString(),
          entry.lastAccessedAt.toISOString(),
          entry.expiresAt?.toISOString() || '',
        ]);
        
        return [headers, ...rows].map(row => row.join(',')).join('\n');
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  async resetStats(): Promise<void> {
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.stats.sets = 0;
    this.stats.deletes = 0;
    this.stats.evictions = 0;
    
    this.logger.info('Cache statistics reset');
  }
}
