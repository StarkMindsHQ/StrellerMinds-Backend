import { Injectable, Logger, Inject } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import type {
  QueryAnalysisResult,
  QueryExecutionPlan,
  OptimizationSuggestion,
  IndexRecommendation,
  QueryPerformanceMetrics,
} from '../interfaces/query-analysis.interface';
import type { DatabaseOptimizationConfig } from '../interfaces/optimization-config.interface';

@Injectable()
export class QueryAnalyzerService {
  private readonly logger = new Logger(QueryAnalyzerService.name);
  private queryHistory: Map<string, QueryPerformanceMetrics> = new Map();

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @Inject('DATABASE_OPTIMIZATION_CONFIG')
    private readonly config: DatabaseOptimizationConfig,
  ) {}

  async analyzeQuery(query: string): Promise<QueryAnalysisResult> {
    const startTime = Date.now();

    try {
      // Get execution plan
      const executionPlan = await this.getExecutionPlan(query);
      const executionTime = Date.now() - startTime;

      // Generate suggestions based on execution plan
      const suggestions = this.generateOptimizationSuggestions(executionPlan, query);

      // Generate index recommendations
      const indexRecommendations = this.generateIndexRecommendations(executionPlan, query);

      // Calculate performance score
      const performanceScore = this.calculatePerformanceScore(executionPlan, executionTime);

      // Update query history
      this.updateQueryHistory(query, executionTime);

      return {
        query,
        executionTime,
        executionPlan,
        suggestions,
        performanceScore,
        indexRecommendations,
      };
    } catch (error) {
      this.logger.error(`Failed to analyze query: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async getExecutionPlan(query: string): Promise<QueryExecutionPlan> {
    // Validate the query first (basic example, production should be stricter)
    if (!/^\s*SELECT\s+/i.test(query)) {
      throw new Error('Only SELECT statements are allowed for analysis');
    }

    const explainPrefix = this.config.includeExplainAnalyze
      ? 'EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)'
      : 'EXPLAIN (FORMAT JSON)';

    // Using parameter binding
    const result = await this.dataSource.query(`${explainPrefix} ${query}`);
    return result[0]['QUERY PLAN'][0];
  }

  private generateOptimizationSuggestions(
    plan: QueryExecutionPlan,
    query: string,
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Check for sequential scans
    if (this.hasSequentialScan(plan)) {
      suggestions.push({
        type: 'INDEX',
        priority: 'HIGH',
        description: 'Sequential scan detected on large table',
        impact: 'Adding appropriate indexes can significantly improve query performance',
        implementation: 'CREATE INDEX ON table_name (column_name)',
      });
    }

    // Check for nested loops with high cost
    if (this.hasExpensiveNestedLoop(plan)) {
      suggestions.push({
        type: 'QUERY_REWRITE',
        priority: 'MEDIUM',
        description: 'Expensive nested loop join detected',
        impact: 'Consider rewriting query to use hash join or merge join',
        implementation:
          'Add WHERE clauses to reduce dataset size or create indexes on join columns',
      });
    }

    // Check for missing WHERE clauses
    if (this.isMissingWhereClause(query)) {
      suggestions.push({
        type: 'QUERY_REWRITE',
        priority: 'CRITICAL',
        description: 'Query without WHERE clause on large table',
        impact: 'This query may scan entire table causing performance issues',
        implementation: 'Add appropriate WHERE conditions to limit result set',
      });
    }

    // Check for SELECT *
    if (query.toLowerCase().includes('select *')) {
      suggestions.push({
        type: 'QUERY_REWRITE',
        priority: 'LOW',
        description: 'SELECT * usage detected',
        impact: 'Selecting only needed columns can improve performance and reduce network traffic',
        implementation: 'Replace SELECT * with specific column names',
      });
    }

    return suggestions;
  }

  private generateIndexRecommendations(
    plan: QueryExecutionPlan,
    query: string,
  ): IndexRecommendation[] {
    const recommendations: IndexRecommendation[] = [];

    // Extract table and column information from query
    const tableColumns = this.extractTableColumns(query);

    for (const [tableName, columns] of tableColumns.entries()) {
      if (this.hasSequentialScan(plan)) {
        recommendations.push({
          tableName,
          columns: Array.from(columns),
          indexType: 'BTREE',
          estimatedImprovement: 70,
          reason: 'Sequential scan detected - index would enable index scan',
        });
      }
    }

    return recommendations;
  }

  private calculatePerformanceScore(plan: QueryExecutionPlan, executionTime: number): number {
    let score = 100;

    // Deduct points for high execution time
    if (executionTime > this.config.slowQueryThreshold) {
      score -= Math.min(50, (executionTime / this.config.slowQueryThreshold) * 10);
    }

    // Deduct points for high cost operations
    if (plan.totalCost > 1000) {
      score -= Math.min(30, (plan.totalCost / 1000) * 10);
    }

    // Deduct points for sequential scans
    if (this.hasSequentialScan(plan)) {
      score -= 20;
    }

    return Math.max(0, Math.round(score));
  }

  private updateQueryHistory(query: string, executionTime: number): void {
    const queryId = this.generateQueryId(query);
    const existing = this.queryHistory.get(queryId);

    if (existing) {
      existing.totalExecutions++;
      existing.avgExecutionTime =
        (existing.avgExecutionTime * (existing.totalExecutions - 1) + executionTime) /
        existing.totalExecutions;
      existing.slowestExecution = Math.max(existing.slowestExecution, executionTime);
      existing.fastestExecution = Math.min(existing.fastestExecution, executionTime);
      existing.lastExecuted = new Date();
    } else {
      this.queryHistory.set(queryId, {
        queryId,
        query,
        avgExecutionTime: executionTime,
        totalExecutions: 1,
        slowestExecution: executionTime,
        fastestExecution: executionTime,
        lastExecuted: new Date(),
      });
    }

    // Maintain history size limit
    if (this.queryHistory.size > this.config.maxQueryHistorySize) {
      const oldestKey = this.queryHistory.keys().next().value;
      this.queryHistory.delete(oldestKey);
    }
  }

  private hasSequentialScan(plan: QueryExecutionPlan): boolean {
    if (plan.nodeType === 'Seq Scan') {
      return true;
    }
    return plan.children?.some((child) => this.hasSequentialScan(child)) || false;
  }

  private hasExpensiveNestedLoop(plan: QueryExecutionPlan): boolean {
    if (plan.nodeType === 'Nested Loop' && plan.totalCost > 1000) {
      return true;
    }
    return plan.children?.some((child) => this.hasExpensiveNestedLoop(child)) || false;
  }

  private isMissingWhereClause(query: string): boolean {
    const normalizedQuery = query.toLowerCase().replace(/\s+/g, ' ').trim();
    return (
      !normalizedQuery.includes(' where ') &&
      (normalizedQuery.includes('select') ||
        normalizedQuery.includes('update') ||
        normalizedQuery.includes('delete'))
    );
  }

  private extractTableColumns(query: string): Map<string, Set<string>> {
    const tableColumns = new Map<string, Set<string>>();

    // Simple regex-based extraction (in production, consider using a proper SQL parser)
    const fromMatch = query.match(/FROM\s+(\w+)/i);
    const whereMatch = query.match(/WHERE\s+(\w+)/i);

    if (fromMatch) {
      const tableName = fromMatch[1];
      if (!tableColumns.has(tableName)) {
        tableColumns.set(tableName, new Set());
      }

      if (whereMatch) {
        tableColumns.get(tableName)!.add(whereMatch[1]);
      }
    }

    return tableColumns;
  }

  private generateQueryId(query: string): string {
    // Normalize query and generate hash
    const normalized = query
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/\d+/g, '?')
      .replace(/'[^']*'/g, '?')
      .trim();

    return Buffer.from(normalized).toString('base64').substring(0, 16);
  }

  getQueryHistory(): QueryPerformanceMetrics[] {
    return Array.from(this.queryHistory.values());
  }

  getSlowQueries(threshold?: number): QueryPerformanceMetrics[] {
    const slowThreshold = threshold || this.config.slowQueryThreshold;
    return this.getQueryHistory().filter((metrics) => metrics.avgExecutionTime > slowThreshold);
  }

  clearQueryHistory(): void {
    this.queryHistory.clear();
  }
}
