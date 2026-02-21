import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { QueryOptimization, OptimizationStatus } from '../entities/query-optimization.entity';
import { QueryAnalysis } from '../interfaces/apm.interface';
import { DatabaseMonitorService } from '../../database/database.monitor.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class DatabaseOptimizationService {
  private readonly logger = new Logger(DatabaseOptimizationService.name);
  private readonly slowQueryThreshold = 1000; // 1 second
  private queryCache = new Map<string, QueryAnalysis>();

  constructor(
    @InjectRepository(QueryOptimization)
    private optimizationRepository: Repository<QueryOptimization>,
    @InjectDataSource()
    private dataSource: DataSource,
    private databaseMonitor: DatabaseMonitorService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Analyze a slow query and provide optimization recommendations
   */
  async analyzeQuery(query: string, duration: number, rowsAffected?: number): Promise<QueryAnalysis> {
    if (duration < this.slowQueryThreshold) {
      return {
        query,
        duration,
        rows: rowsAffected || 0,
      };
    }

    // Check cache
    const cacheKey = this.getQueryHash(query);
    if (this.queryCache.has(cacheKey)) {
      return this.queryCache.get(cacheKey)!;
    }

    try {
      // Get query execution plan
      const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`;
      const planResult = await this.dataSource.query(explainQuery);
      const plan = planResult[0]?.['QUERY PLAN']?.[0]?.Plan;

      // Analyze the plan
      const analysis = await this.analyzeQueryPlan(query, plan, duration);

      // Check for missing indexes
      const missingIndexes = await this.detectMissingIndexes(query, plan);

      // Check for unused indexes on affected tables
      const unusedIndexes = await this.getUnusedIndexesForQuery(query);

      const queryAnalysis: QueryAnalysis = {
        query,
        duration,
        rows: rowsAffected || 0,
        plan,
        indexes: missingIndexes,
        recommendations: this.generateRecommendations(analysis, missingIndexes, unusedIndexes),
      };

      // Cache the analysis
      this.queryCache.set(cacheKey, queryAnalysis);

      // Save optimization record
      await this.saveOptimizationRecord(query, duration, analysis, missingIndexes, unusedIndexes, plan);

      return queryAnalysis;
    } catch (error) {
      this.logger.error(`Failed to analyze query: ${error.message}`);
      return {
        query,
        duration,
        rows: rowsAffected || 0,
        recommendations: ['Unable to analyze query - check syntax'],
      };
    }
  }

  /**
   * Analyze query execution plan
   */
  private async analyzeQueryPlan(
    query: string,
    plan: any,
    duration: number,
  ): Promise<{
    tableScans: boolean;
    indexScans: boolean;
    sequentialScans: boolean;
    joinOptimizations: string[];
    cost: number;
  }> {
    const analysis = {
      tableScans: false,
      indexScans: false,
      sequentialScans: false,
      joinOptimizations: [] as string[],
      cost: plan?.Total Cost || 0,
    };

    if (!plan) return analysis;

    // Recursively check plan nodes
    const checkNode = (node: any) => {
      if (node['Node Type'] === 'Seq Scan') {
        analysis.sequentialScans = true;
        analysis.tableScans = true;
      }
      if (node['Node Type']?.includes('Index')) {
        analysis.indexScans = true;
      }
      if (node['Node Type'] === 'Nested Loop' && node['Total Cost'] > 1000) {
        analysis.joinOptimizations.push('Consider hash join for large tables');
      }
      if (node['Plans']) {
        node['Plans'].forEach(checkNode);
      }
    };

    checkNode(plan);

    return analysis;
  }

  /**
   * Detect missing indexes
   */
  private async detectMissingIndexes(query: string, plan: any): Promise<string[]> {
    const missingIndexes: string[] = [];

    if (!plan) return missingIndexes;

    // Extract table names and WHERE conditions from query
    const tableMatch = query.match(/FROM\s+(\w+)/i);
    const whereMatch = query.match(/WHERE\s+(.+?)(?:ORDER|GROUP|LIMIT|$)/i);

    if (tableMatch && whereMatch) {
      const tableName = tableMatch[1];
      const whereClause = whereMatch[1];

      // Check if sequential scan is used (indicates missing index)
      if (plan['Node Type'] === 'Seq Scan') {
        // Extract column names from WHERE clause
        const columnMatches = whereClause.match(/(\w+)\s*[=<>]/g);
        if (columnMatches) {
          columnMatches.forEach((match) => {
            const column = match.split(/\s/)[0];
            missingIndexes.push(`CREATE INDEX idx_${tableName}_${column} ON ${tableName}(${column})`);
          });
        }
      }
    }

    return missingIndexes;
  }

  /**
   * Get unused indexes for tables in query
   */
  private async getUnusedIndexesForQuery(query: string): Promise<string[]> {
    try {
      const tableMatch = query.match(/FROM\s+(\w+)/i);
      if (!tableMatch) return [];

      const tableName = tableMatch[1];
      const unusedIndexes = await this.databaseMonitor.getUnusedIndexes();

      return unusedIndexes
        .filter((idx) => idx.tableName.includes(tableName))
        .map((idx) => idx.indexName);
    } catch (error) {
      this.logger.error(`Failed to get unused indexes: ${error.message}`);
      return [];
    }
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(
    analysis: any,
    missingIndexes: string[],
    unusedIndexes: string[],
  ): string[] {
    const recommendations: string[] = [];

    if (analysis.sequentialScans) {
      recommendations.push('Consider adding indexes to avoid sequential scans');
    }

    if (missingIndexes.length > 0) {
      recommendations.push(`Missing indexes detected: ${missingIndexes.length} potential indexes`);
    }

    if (unusedIndexes.length > 0) {
      recommendations.push(`Unused indexes found: Consider removing ${unusedIndexes.length} indexes`);
    }

    if (analysis.joinOptimizations.length > 0) {
      recommendations.push(...analysis.joinOptimizations);
    }

    if (analysis.cost > 10000) {
      recommendations.push('High query cost detected - consider query restructuring');
    }

    return recommendations;
  }

  /**
   * Save optimization record
   */
  private async saveOptimizationRecord(
    query: string,
    duration: number,
    analysis: any,
    missingIndexes: string[],
    unusedIndexes: string[],
    plan: any,
  ): Promise<void> {
    try {
      const optimization = this.optimizationRepository.create({
        originalQuery: query.substring(0, 5000), // Truncate if too long
        tableName: this.extractTableName(query),
        originalDuration: duration,
        analysis: {
          missingIndexes,
          unusedIndexes,
          tableScans: analysis.sequentialScans,
          joinOptimizations: analysis.joinOptimizations,
          queryPlan: plan,
        },
        recommendation: this.generateRecommendations(analysis, missingIndexes, unusedIndexes).join('; '),
        status: OptimizationStatus.PENDING,
      });

      await this.optimizationRepository.save(optimization);

      // Emit event for slow query
      this.eventEmitter.emit('query.slow', {
        query,
        duration,
        optimization: optimization.id,
      });
    } catch (error) {
      this.logger.error(`Failed to save optimization record: ${error.message}`);
    }
  }

  /**
   * Apply optimization recommendations
   */
  async applyOptimization(optimizationId: string): Promise<{ success: boolean; message: string }> {
    try {
      const optimization = await this.optimizationRepository.findOne({
        where: { id: optimizationId },
      });

      if (!optimization) {
        return { success: false, message: 'Optimization not found' };
      }

      if (optimization.status === OptimizationStatus.APPLIED) {
        return { success: false, message: 'Optimization already applied' };
      }

      const appliedChanges: any = {};

      // Apply missing indexes
      if (optimization.analysis.missingIndexes && optimization.analysis.missingIndexes.length > 0) {
        const indexesCreated: string[] = [];
        for (const indexSql of optimization.analysis.missingIndexes.slice(0, 5)) {
          // Limit to 5 indexes per optimization
          try {
            await this.dataSource.query(indexSql);
            indexesCreated.push(indexSql);
          } catch (error) {
            this.logger.warn(`Failed to create index: ${error.message}`);
          }
        }
        appliedChanges.indexesCreated = indexesCreated;
      }

      // Remove unused indexes (with caution)
      if (optimization.analysis.unusedIndexes && optimization.analysis.unusedIndexes.length > 0) {
        // Only suggest, don't auto-remove
        appliedChanges.indexesDropped = [];
      }

      optimization.status = OptimizationStatus.APPLIED;
      optimization.appliedAt = new Date();
      optimization.appliedChanges = appliedChanges;

      await this.optimizationRepository.save(optimization);

      this.eventEmitter.emit('optimization.applied', { optimizationId, appliedChanges });

      return { success: true, message: 'Optimization applied successfully' };
    } catch (error) {
      this.logger.error(`Failed to apply optimization: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get pending optimizations
   */
  async getPendingOptimizations(limit: number = 50): Promise<QueryOptimization[]> {
    return this.optimizationRepository.find({
      where: { status: OptimizationStatus.PENDING },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get optimization statistics
   */
  async getOptimizationStats(): Promise<{
    total: number;
    pending: number;
    applied: number;
    rejected: number;
    averageImprovement: number;
  }> {
    const [total, pending, applied, rejected] = await Promise.all([
      this.optimizationRepository.count(),
      this.optimizationRepository.count({ where: { status: OptimizationStatus.PENDING } }),
      this.optimizationRepository.count({ where: { status: OptimizationStatus.APPLIED } }),
      this.optimizationRepository.count({ where: { status: OptimizationStatus.REJECTED } }),
    ]);

    const appliedOptimizations = await this.optimizationRepository.find({
      where: { status: OptimizationStatus.APPLIED },
    });

    const improvements = appliedOptimizations
      .filter((o) => o.improvement !== null && o.improvement !== undefined)
      .map((o) => o.improvement!);

    const averageImprovement =
      improvements.length > 0 ? improvements.reduce((a, b) => a + b, 0) / improvements.length : 0;

    return {
      total,
      pending,
      applied,
      rejected,
      averageImprovement,
    };
  }

  /**
   * Extract table name from query
   */
  private extractTableName(query: string): string {
    const match = query.match(/FROM\s+(\w+)/i);
    return match ? match[1] : 'unknown';
  }

  /**
   * Get query hash for caching
   */
  private getQueryHash(query: string): string {
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
      const char = query.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }
}
