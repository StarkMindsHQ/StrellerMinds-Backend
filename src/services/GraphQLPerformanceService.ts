import { Injectable, Logger } from '@nestjs/common';
import { DocumentNode } from 'graphql';
import { QueryOptimizer, QueryComplexityAnalysis } from './QueryOptimizer';
import { PersistedQueries, PersistedQuery } from './PersistedQueries';
import { ResponseCache, CacheStats } from './ResponseCache';

export interface PerformanceMetrics {
  queryId: string;
  queryHash: string;
  operationType: string;
  complexity: number;
  executionTime: number;
  cacheHit: boolean;
  timestamp: Date;
  userId?: string;
  clientName?: string;
  errors?: string[];
  warnings?: string[];
}

export interface QueryPerformanceReport {
  timeRange: { start: Date; end: Date };
  totalQueries: number;
  averageComplexity: number;
  averageExecutionTime: number;
  cacheHitRate: number;
  errorRate: number;
  topSlowQueries: PerformanceMetrics[];
  topComplexQueries: PerformanceMetrics[];
  queriesByOperationType: Record<string, number>;
  queriesByComplexity: Record<string, number>;
  hourlyPerformance: Record<number, {
    queryCount: number;
    avgComplexity: number;
    avgExecutionTime: number;
    cacheHitRate: number;
  }>;
  recommendations: string[];
}

export interface PerformanceAlert {
  type: 'HIGH_COMPLEXITY' | 'SLOW_EXECUTION' | 'LOW_CACHE_HIT_RATE' | 'ERROR_SPIKE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  queryId?: string;
  timestamp: Date;
  metadata?: any;
}

export interface OptimizationSuggestion {
  queryId: string;
  query: string;
  type: 'COMPLEXITY' | 'CACHING' | 'PERSISTENCE' | 'SCHEMA';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  impact: string;
  implementation: string;
  estimatedImprovement: {
    complexityReduction?: number;
    timeReduction?: number;
    cacheHitRateIncrease?: number;
  };
}

@Injectable()
export class GraphQLPerformanceService {
  private readonly logger = new Logger(GraphQLPerformanceService.name);
  private readonly metrics = new Map<string, PerformanceMetrics[]>();
  private readonly alerts = new Map<string, PerformanceAlert[]>();
  private readonly performanceThresholds = {
    maxComplexity: 100,
    maxExecutionTime: 1000, // 1 second
    minCacheHitRate: 0.8, // 80%
    maxErrorRate: 0.05, // 5%
  };

  constructor(
    private readonly queryOptimizer: QueryOptimizer,
    private readonly persistedQueries: PersistedQueries,
    private readonly responseCache: ResponseCache,
  ) {
    this.initializePerformanceMonitoring();
  }

  private initializePerformanceMonitoring(): void {
    // Set up periodic performance analysis
    setInterval(() => {
      this.analyzePerformance();
    }, 60000); // Every minute

    // Set up alert processing
    setInterval(() => {
      this.processAlerts();
    }, 300000); // Every 5 minutes
  }

  async trackQueryPerformance(
    query: DocumentNode,
    variables?: any,
    context?: any,
    executionTime?: number,
    errors?: string[],
  ): Promise<PerformanceMetrics> {
    const queryId = this.generateQueryId(query);
    const queryHash = this.generateQueryHash(query);
    const operationType = this.getOperationType(query);

    // Analyze query complexity
    const complexityAnalysis = this.queryOptimizer.analyzeQueryComplexity(query, variables, context);

    // Check cache hit
    const cacheResult = await this.responseCache.get(query, variables, context);
    const cacheHit = cacheResult !== null;

    const metrics: PerformanceMetrics = {
      queryId,
      queryHash,
      operationType,
      complexity: complexityAnalysis.complexity,
      executionTime: executionTime || 0,
      cacheHit,
      timestamp: new Date(),
      userId: context?.user?.id,
      clientName: context?.clientName,
      errors,
      warnings: complexityAnalysis.warnings,
    };

    // Store metrics
    const dateKey = this.getDateKey(metrics.timestamp);
    if (!this.metrics.has(dateKey)) {
      this.metrics.set(dateKey, []);
    }
    this.metrics.get(dateKey)!.push(metrics);

    // Check for performance alerts
    await this.checkPerformanceAlerts(metrics);

    this.logger.debug(`Query performance tracked: ${queryId}, complexity: ${metrics.complexity}, time: ${metrics.executionTime}ms`);

    return metrics;
  }

  async getPerformanceReport(
    timeRange: { start: Date; end: Date },
    options?: {
      userId?: string;
      clientName?: string;
      operationType?: string;
    },
  ): Promise<QueryPerformanceReport> {
    const allMetrics = this.getMetricsInRange(timeRange);
    
    // Apply filters
    let filteredMetrics = allMetrics;
    
    if (options?.userId) {
      filteredMetrics = filteredMetrics.filter(m => m.userId === options.userId);
    }
    
    if (options?.clientName) {
      filteredMetrics = filteredMetrics.filter(m => m.clientName === options.clientName);
    }
    
    if (options?.operationType) {
      filteredMetrics = filteredMetrics.filter(m => m.operationType === options.operationType);
    }

    // Calculate statistics
    const totalQueries = filteredMetrics.length;
    const averageComplexity = totalQueries > 0 
      ? filteredMetrics.reduce((sum, m) => sum + m.complexity, 0) / totalQueries 
      : 0;
    const averageExecutionTime = totalQueries > 0 
      ? filteredMetrics.reduce((sum, m) => sum + m.executionTime, 0) / totalQueries 
      : 0;
    const cacheHits = filteredMetrics.filter(m => m.cacheHit).length;
    const cacheHitRate = totalQueries > 0 ? (cacheHits / totalQueries) * 100 : 0;
    const errors = filteredMetrics.filter(m => m.errors && m.errors.length > 0).length;
    const errorRate = totalQueries > 0 ? (errors / totalQueries) * 100 : 0;

    // Top slow queries
    const topSlowQueries = filteredMetrics
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, 10);

    // Top complex queries
    const topComplexQueries = filteredMetrics
      .sort((a, b) => b.complexity - a.complexity)
      .slice(0, 10);

    // Queries by operation type
    const queriesByOperationType: Record<string, number> = {};
    filteredMetrics.forEach(m => {
      queriesByOperationType[m.operationType] = (queriesByOperationType[m.operationType] || 0) + 1;
    });

    // Queries by complexity range
    const queriesByComplexity: Record<string, number> = {};
    filteredMetrics.forEach(m => {
      let range = 'low';
      if (m.complexity > 100) range = 'high';
      else if (m.complexity > 50) range = 'medium';
      
      queriesByComplexity[range] = (queriesByComplexity[range] || 0) + 1;
    });

    // Hourly performance
    const hourlyPerformance: Record<number, any> = {};
    filteredMetrics.forEach(m => {
      const hour = m.timestamp.getHours();
      if (!hourlyPerformance[hour]) {
        hourlyPerformance[hour] = {
          queryCount: 0,
          totalComplexity: 0,
          totalExecutionTime: 0,
          cacheHits: 0,
        };
      }
      
      const hp = hourlyPerformance[hour];
      hp.queryCount++;
      hp.totalComplexity += m.complexity;
      hp.totalExecutionTime += m.executionTime;
      if (m.cacheHit) hp.cacheHits++;
    });

    // Calculate hourly averages
    for (const hour in hourlyPerformance) {
      const hp = hourlyPerformance[hour];
      hourlyPerformance[hour] = {
        queryCount: hp.queryCount,
        avgComplexity: hp.totalComplexity / hp.queryCount,
        avgExecutionTime: hp.totalExecutionTime / hp.queryCount,
        cacheHitRate: (hp.cacheHits / hp.queryCount) * 100,
      };
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(filteredMetrics, {
      averageComplexity,
      averageExecutionTime,
      cacheHitRate,
      errorRate,
    });

    return {
      timeRange,
      totalQueries,
      averageComplexity: Math.round(averageComplexity * 100) / 100,
      averageExecutionTime: Math.round(averageExecutionTime * 100) / 100,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      errorRate: Math.round(errorRate * 100) / 100,
      topSlowQueries,
      topComplexQueries,
      queriesByOperationType,
      queriesByComplexity,
      hourlyPerformance,
      recommendations,
    };
  }

  async generateOptimizationSuggestions(
    timeRange: { start: Date; end: Date },
  ): Promise<OptimizationSuggestion[]> {
    const metrics = this.getMetricsInRange(timeRange);
    const suggestions: OptimizationSuggestion[] = [];

    // Analyze slow queries
    const slowQueries = metrics
      .filter(m => m.executionTime > this.performanceThresholds.maxExecutionTime)
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, 20);

    for (const metric of slowQueries) {
      suggestions.push({
        queryId: metric.queryId,
        query: '', // Would be populated from persisted queries
        type: 'COMPLEXITY',
        priority: metric.executionTime > 2000 ? 'HIGH' : 'MEDIUM',
        description: `Query execution time (${metric.executionTime}ms) exceeds threshold`,
        impact: 'Improves user experience and reduces server load',
        implementation: 'Consider adding pagination, reducing field selection, or optimizing resolvers',
        estimatedImprovement: {
          timeReduction: metric.executionTime * 0.5, // Estimate 50% improvement
        },
      });
    }

    // Analyze complex queries
    const complexQueries = metrics
      .filter(m => m.complexity > this.performanceThresholds.maxComplexity)
      .sort((a, b) => b.complexity - a.complexity)
      .slice(0, 20);

    for (const metric of complexQueries) {
      suggestions.push({
        queryId: metric.queryId,
        query: '',
        type: 'COMPLEXITY',
        priority: metric.complexity > 200 ? 'HIGH' : 'MEDIUM',
        description: `Query complexity (${metric.complexity}) exceeds threshold`,
        impact: 'Reduces computational overhead and improves response times',
        implementation: 'Consider query splitting, field-level permissions, or data loader optimization',
        estimatedImprovement: {
          complexityReduction: metric.complexity * 0.3, // Estimate 30% reduction
        },
      });
    }

    // Analyze cache performance
    const cacheMissQueries = metrics.filter(m => !m.cacheHit).slice(0, 20);
    
    if (cacheMissQueries.length > 10) {
      suggestions.push({
        queryId: 'multiple',
        query: '',
        type: 'CACHING',
        priority: 'MEDIUM',
        description: 'High cache miss rate detected for multiple queries',
        impact: 'Significantly improves response times for repeated queries',
        implementation: 'Enable response caching for frequently executed queries',
        estimatedImprovement: {
          cacheHitRateIncrease: 60, // Estimate 60% improvement
        },
      });
    }

    // Analyze error patterns
    const errorQueries = metrics.filter(m => m.errors && m.errors.length > 0);
    
    if (errorQueries.length > 5) {
      suggestions.push({
        queryId: 'multiple',
        query: '',
        type: 'SCHEMA',
        priority: 'HIGH',
        description: 'Multiple query errors detected',
        impact: 'Improves reliability and user experience',
        implementation: 'Review query validation, input types, and resolver error handling',
        estimatedImprovement: {
          timeReduction: 200, // Estimate 200ms improvement
        },
      });
    }

    return suggestions.sort((a, b) => {
      const priorityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  async getPerformanceAlerts(
    timeRange?: { start: Date; end: Date },
  ): Promise<PerformanceAlert[]> {
    const allAlerts = Array.from(this.alerts.values()).flat();
    
    if (timeRange) {
      return allAlerts.filter(alert => 
        alert.timestamp >= timeRange.start && alert.timestamp <= timeRange.end
      );
    }
    
    return allAlerts;
  }

  async optimizeQuery(query: DocumentNode): Promise<{
    originalAnalysis: QueryComplexityAnalysis;
    optimizedAnalysis?: QueryComplexityAnalysis;
    optimizations: string[];
    persistedQuery?: PersistedQuery;
  }> {
    // Analyze original query
    const originalAnalysis = this.queryOptimizer.analyzeQueryComplexity(query);
    
    // Generate optimizations
    const optimizationResult = await this.queryOptimizer.optimizeQuery(query, originalAnalysis);
    
    // Analyze optimized query
    const optimizedAnalysis = this.queryOptimizer.analyzeQueryComplexity(optimizationResult.optimizedQuery);
    
    // Check if query should be persisted
    let persistedQuery: PersistedQuery | undefined;
    if (originalAnalysis.complexity > 10) {
      try {
        const queryStr = this.printQuery(query);
        persistedQuery = await this.persistedQueries.createPersistedQuery(queryStr, {
          name: `Auto-optimized query ${Date.now()}`,
          description: 'Automatically created based on performance analysis',
          tags: ['auto-optimized', 'performance'],
          complexity: originalAnalysis.complexity,
          estimatedTime: originalAnalysis.estimatedTime,
        });
      } catch (error) {
        this.logger.warn(`Failed to create persisted query: ${error.message}`);
      }
    }

    return {
      originalAnalysis,
      optimizedAnalysis,
      optimizations: optimizationResult.optimizations,
      persistedQuery,
    };
  }

  async enablePerformanceMonitoring(enabled: boolean): Promise<void> {
    if (enabled) {
      this.logger.info('Performance monitoring enabled');
    } else {
      this.logger.info('Performance monitoring disabled');
    }
  }

  updatePerformanceThresholds(thresholds: Partial<typeof this.performanceThresholds>): void {
    Object.assign(this.performanceThresholds, thresholds);
    this.logger.debug('Performance thresholds updated');
  }

  getPerformanceThresholds(): typeof this.performanceThresholds {
    return { ...this.performanceThresholds };
  }

  async exportPerformanceData(
    timeRange: { start: Date; end: Date },
    format: 'json' | 'csv' = 'json',
  ): Promise<string> {
    const metrics = this.getMetricsInRange(timeRange);

    switch (format) {
      case 'json':
        return JSON.stringify(metrics, null, 2);
      
      case 'csv':
        const headers = [
          'queryId', 'queryHash', 'operationType', 'complexity', 
          'executionTime', 'cacheHit', 'timestamp', 'userId', 'clientName'
        ];
        const rows = metrics.map(m => [
          m.queryId,
          m.queryHash,
          m.operationType,
          m.complexity,
          m.executionTime,
          m.cacheHit,
          m.timestamp.toISOString(),
          m.userId || '',
          m.clientName || '',
        ]);
        
        return [headers, ...rows].map(row => row.join(',')).join('\n');
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  async clearPerformanceData(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    let deletedCount = 0;
    
    for (const [dateKey, metrics] of this.metrics.entries()) {
      const keyDate = new Date(dateKey);
      if (keyDate < cutoffDate) {
        this.metrics.delete(dateKey);
        deletedCount += metrics.length;
      }
    }

    this.logger.info(`Cleared performance data older than ${olderThanDays} days: ${deletedCount} records`);
    return deletedCount;
  }

  private getMetricsInRange(timeRange: { start: Date; end: Date }): PerformanceMetrics[] {
    const metrics: PerformanceMetrics[] = [];
    
    for (const [dateKey, dayMetrics] of this.metrics.entries()) {
      const keyDate = new Date(dateKey);
      if (keyDate >= timeRange.start && keyDate <= timeRange.end) {
        metrics.push(...dayMetrics);
      }
    }
    
    return metrics;
  }

  private getDateKey(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private generateQueryId(query: DocumentNode): string {
    // Generate a unique ID for the query
    const queryStr = this.printQuery(query);
    let hash = 0;
    for (let i = 0; i < queryStr.length; i++) {
      const char = queryStr.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `query_${hash.toString(36)}`;
  }

  private generateQueryHash(query: DocumentNode): string {
    const queryStr = this.printQuery(query);
    let hash = 0;
    for (let i = 0; i < queryStr.length; i++) {
      const char = queryStr.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  private getOperationType(query: DocumentNode): string {
    const operation = query.definitions.find(
      (def): def is any => def.kind === 'OperationDefinition'
    ) as any;

    return operation?.operation || 'query';
  }

  private printQuery(query: DocumentNode): string {
    // This would typically use GraphQL's print function
    // For now, return a simplified representation
    return JSON.stringify(query);
  }

  private async checkPerformanceAlerts(metrics: PerformanceMetrics): Promise<void> {
    const alerts: PerformanceAlert[] = [];

    // High complexity alert
    if (metrics.complexity > this.performanceThresholds.maxComplexity) {
      alerts.push({
        type: 'HIGH_COMPLEXITY',
        severity: metrics.complexity > 200 ? 'HIGH' : 'MEDIUM',
        message: `Query complexity (${metrics.complexity}) exceeds threshold (${this.performanceThresholds.maxComplexity})`,
        queryId: metrics.queryId,
        timestamp: metrics.timestamp,
        metadata: { complexity: metrics.complexity },
      });
    }

    // Slow execution alert
    if (metrics.executionTime > this.performanceThresholds.maxExecutionTime) {
      alerts.push({
        type: 'SLOW_EXECUTION',
        severity: metrics.executionTime > 2000 ? 'HIGH' : 'MEDIUM',
        message: `Query execution time (${metrics.executionTime}ms) exceeds threshold (${this.performanceThresholds.maxExecutionTime}ms)`,
        queryId: metrics.queryId,
        timestamp: metrics.timestamp,
        metadata: { executionTime: metrics.executionTime },
      });
    }

    // Error alert
    if (metrics.errors && metrics.errors.length > 0) {
      alerts.push({
        type: 'ERROR_SPIKE',
        severity: 'HIGH',
        message: `Query execution failed: ${metrics.errors.join(', ')}`,
        queryId: metrics.queryId,
        timestamp: metrics.timestamp,
        metadata: { errors: metrics.errors },
      });
    }

    // Store alerts
    if (alerts.length > 0) {
      const dateKey = this.getDateKey(metrics.timestamp);
      if (!this.alerts.has(dateKey)) {
        this.alerts.set(dateKey, []);
      }
      this.alerts.get(dateKey)!.push(...alerts);
    }
  }

  private async analyzePerformance(): Promise<void> {
    // Periodic performance analysis
    const now = new Date();
    const timeRange = {
      start: new Date(now.getTime() - 3600000), // Last hour
      end: now,
    };

    const report = await this.getPerformanceReport(timeRange);
    
    // Check for system-wide issues
    if (report.errorRate > this.performanceThresholds.maxErrorRate * 100) {
      this.logger.warn(`High error rate detected: ${report.errorRate}%`);
    }

    if (report.cacheHitRate < this.performanceThresholds.minCacheHitRate * 100) {
      this.logger.warn(`Low cache hit rate detected: ${report.cacheHitRate}%`);
    }

    if (report.averageExecutionTime > this.performanceThresholds.maxExecutionTime) {
      this.logger.warn(`High average execution time detected: ${report.averageExecutionTime}ms`);
    }
  }

  private async processAlerts(): Promise<void> {
    // Process and potentially resolve alerts
    const now = new Date();
    const recentAlerts = await this.getPerformanceAlerts({
      start: new Date(now.getTime() - 300000), // Last 5 minutes
      end: now,
    });

    // Group alerts by type and severity
    const criticalAlerts = recentAlerts.filter(a => a.severity === 'CRITICAL');
    
    if (criticalAlerts.length > 0) {
      this.logger.error(`Critical performance alerts detected: ${criticalAlerts.length}`);
      // In a real implementation, you might send notifications, create incidents, etc.
    }
  }

  private generateRecommendations(
    metrics: PerformanceMetrics[],
    stats: {
      averageComplexity: number;
      averageExecutionTime: number;
      cacheHitRate: number;
      errorRate: number;
    },
  ): string[] {
    const recommendations: string[] = [];

    if (stats.averageComplexity > this.performanceThresholds.maxComplexity * 0.8) {
      recommendations.push('Consider implementing query complexity limits and optimization');
    }

    if (stats.averageExecutionTime > this.performanceThresholds.maxExecutionTime * 0.8) {
      recommendations.push('Optimize slow queries and consider implementing data loaders');
    }

    if (stats.cacheHitRate < this.performanceThresholds.minCacheHitRate * 100) {
      recommendations.push('Enable response caching for frequently executed queries');
    }

    if (stats.errorRate > this.performanceThresholds.maxErrorRate * 100) {
      recommendations.push('Review query validation and error handling');
    }

    const slowQueries = metrics.filter(m => m.executionTime > 1000).length;
    if (slowQueries > metrics.length * 0.1) {
      recommendations.push(`${slowQueries} queries are slow (>1s). Consider query optimization`);
    }

    return recommendations;
  }
}
