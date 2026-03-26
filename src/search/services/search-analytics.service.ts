import { Injectable, Logger } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { SearchLog } from '../entities/search.entity';

/**
 * Search Analytics Service
 * Tracks, analyzes, and reports on search usage patterns
 */
@Injectable()
export class SearchAnalyticsService {
  private readonly logger = new Logger(SearchAnalyticsService.name);
  private readonly ANALYTICS_INDEX = 'search_analytics';

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    @InjectRepository(SearchLog)
    private readonly searchLogRepo: Repository<SearchLog>,
  ) {}

  /**
   * Log a search query for analytics
   */
  async logSearch(params: SearchLogParams): Promise<void> {
    try {
      const logEntry = {
        userId: params.userId,
        query: params.query,
        normalizedQuery: this.normalizeQuery(params.query),
        filters: params.filters || {},
        resultsCount: params.resultsCount,
        executionTimeMs: params.executionTimeMs,
        clickedResults: [],
        timestamp: new Date().toISOString(),
        userAgent: params.userAgent,
        ipAddress: params.ipAddress,
        sessionId: params.sessionId,
      };

      // Log to Elasticsearch for real-time analytics
      await this.elasticsearchService.index({
        index: this.ANALYTICS_INDEX,
        document: logEntry,
      });

      // Also log to database for persistence
      const searchLog = this.searchLogRepo.create({
        userId: params.userId,
        query: params.query,
        filters: params.filters,
        resultsCount: params.resultsCount,
        executionTime: params.executionTimeMs,
        timestamp: new Date(),
      });
      await this.searchLogRepo.save(searchLog);
    } catch (error) {
      this.logger.error('Failed to log search', error);
    }
  }

  /**
   * Track a click on a search result
   */
  async trackResultClick(
    searchId: string,
    clickedItemId: string,
    position: number,
  ): Promise<void> {
    try {
      // Update the search log with click information
      await this.elasticsearchService.updateByQuery({
        index: this.ANALYTICS_INDEX,
        query: {
          bool: {
            must: [
              { term: { _id: searchId } },
            ],
          },
        },
        script: {
          source: `
            if (ctx._source.clickedResults == null) {
              ctx._source.clickedResults = [];
            }
            ctx._source.clickedResults.add(params.click);
          `,
          params: {
            click: {
              itemId: clickedItemId,
              position,
              timestamp: new Date().toISOString(),
            },
          },
        },
      });
    } catch (error) {
      this.logger.error('Failed to track click', error);
    }
  }

  /**
   * Get search analytics dashboard data
   */
  async getDashboardData(timeRange: TimeRange): Promise<SearchDashboardData> {
    const [overview, trends, popularQueries, failedSearches] = await Promise.all([
      this.getOverviewStats(timeRange),
      this.getSearchTrends(timeRange),
      this.getPopularQueries(timeRange),
      this.getFailedSearches(timeRange),
    ]);

    return {
      overview,
      trends,
      popularQueries,
      failedSearches,
    };
  }

  /**
   * Get overview statistics
   */
  private async getOverviewStats(timeRange: TimeRange): Promise<SearchOverviewStats> {
    const response = await this.elasticsearchService.search({
      index: this.ANALYTICS_INDEX,
      size: 0,
      query: {
        range: {
          timestamp: {
            gte: timeRange.from,
            lte: timeRange.to,
          },
        },
      },
      aggs: {
        total_searches: { value_count: { field: 'query' } },
        unique_queries: { cardinality: { field: 'normalizedQuery' } },
        unique_users: { cardinality: { field: 'userId' } },
        avg_results: { avg: { field: 'resultsCount' } },
        avg_execution_time: { avg: { field: 'executionTimeMs' } },
        zero_results: {
          filter: { term: { resultsCount: 0 } },
        },
        click_throughs: {
          filter: { exists: { field: 'clickedResults' } },
        },
      },
    });

    const aggs = response.aggregations as any;
    const totalSearches = aggs.total_searches.value;
    const zeroResults = aggs.zero_results.doc_count;
    const clickThroughs = aggs.click_throughs.doc_count;

    return {
      totalSearches,
      uniqueQueries: aggs.unique_queries.value,
      uniqueUsers: aggs.unique_users.value,
      averageResultsCount: Math.round(aggs.avg_results.value || 0),
      averageExecutionTimeMs: Math.round(aggs.avg_execution_time.value || 0),
      zeroResultsCount: zeroResults,
      zeroResultsRate: totalSearches > 0 ? (zeroResults / totalSearches) * 100 : 0,
      clickThroughRate: totalSearches > 0 ? (clickThroughs / totalSearches) * 100 : 0,
    };
  }

  /**
   * Get search trends over time
   */
  private async getSearchTrends(timeRange: TimeRange): Promise<SearchTrend[]> {
    const response = await this.elasticsearchService.search({
      index: this.ANALYTICS_INDEX,
      size: 0,
      query: {
        range: {
          timestamp: {
            gte: timeRange.from,
            lte: timeRange.to,
          },
        },
      },
      aggs: {
        searches_over_time: {
          date_histogram: {
            field: 'timestamp',
            calendar_interval: timeRange.interval || 'day',
          },
          aggs: {
            unique_users: { cardinality: { field: 'userId' } },
            avg_results: { avg: { field: 'resultsCount' } },
          },
        },
      },
    });

    const buckets = (response.aggregations as any).searches_over_time.buckets;
    return buckets.map((bucket: any) => ({
      date: bucket.key_as_string,
      searchCount: bucket.doc_count,
      uniqueUsers: bucket.unique_users.value,
      averageResults: Math.round(bucket.avg_results.value || 0),
    }));
  }

  /**
   * Get most popular search queries
   */
  private async getPopularQueries(
    timeRange: TimeRange,
    limit: number = 20,
  ): Promise<PopularQuery[]> {
    const response = await this.elasticsearchService.search({
      index: this.ANALYTICS_INDEX,
      size: 0,
      query: {
        range: {
          timestamp: {
            gte: timeRange.from,
            lte: timeRange.to,
          },
        },
      },
      aggs: {
        popular_queries: {
          terms: {
            field: 'normalizedQuery',
            size: limit,
            min_doc_count: 5,
          },
          aggs: {
            unique_users: { cardinality: { field: 'userId' } },
            avg_results: { avg: { field: 'resultsCount' } },
            click_through_rate: {
              filter: { exists: { field: 'clickedResults' } },
            },
          },
        },
      },
    });

    const buckets = (response.aggregations as any).popular_queries.buckets;
    return buckets.map((bucket: any) => ({
      query: bucket.key,
      count: bucket.doc_count,
      uniqueUsers: bucket.unique_users.value,
      averageResults: Math.round(bucket.avg_results.value || 0),
      clickThroughRate: (bucket.click_through_rate.doc_count / bucket.doc_count) * 100,
    }));
  }

  /**
   * Get searches with zero or few results (potential content gaps)
   */
  private async getFailedSearches(
    timeRange: TimeRange,
    limit: number = 20,
  ): Promise<FailedSearch[]> {
    const response = await this.elasticsearchService.search({
      index: this.ANALYTICS_INDEX,
      size: 0,
      query: {
        bool: {
          must: [
            { range: { timestamp: { gte: timeRange.from, lte: timeRange.to } } },
            { range: { resultsCount: { lte: 3 } } },
          ],
        },
      },
      aggs: {
        failed_queries: {
          terms: {
            field: 'normalizedQuery',
            size: limit,
            min_doc_count: 3,
          },
          aggs: {
            avg_results: { avg: { field: 'resultsCount' } },
          },
        },
      },
    });

    const buckets = (response.aggregations as any).failed_queries.buckets;
    return buckets.map((bucket: any) => ({
      query: bucket.key,
      searchCount: bucket.doc_count,
      averageResults: Math.round(bucket.avg_results.value || 0),
    }));
  }

  /**
   * Get user search history
   */
  async getUserSearchHistory(
    userId: string,
    limit: number = 50,
  ): Promise<UserSearchHistory[]> {
    const logs = await this.searchLogRepo.find({
      where: { userId },
      order: { timestamp: 'DESC' },
      take: limit,
    });

    return logs.map((log) => ({
      query: log.query,
      filters: log.filters,
      resultsCount: log.resultsCount,
      timestamp: log.timestamp,
    }));
  }

  /**
   * Get search performance metrics
   */
  async getPerformanceMetrics(timeRange: TimeRange): Promise<SearchPerformanceMetrics> {
    const response = await this.elasticsearchService.search({
      index: this.ANALYTICS_INDEX,
      size: 0,
      query: {
        range: {
          timestamp: {
            gte: timeRange.from,
            lte: timeRange.to,
          },
        },
      },
      aggs: {
        execution_time_percentiles: {
          percentiles: {
            field: 'executionTimeMs',
            percents: [50, 90, 95, 99],
          },
        },
        execution_time_stats: {
          stats: { field: 'executionTimeMs' },
        },
        slow_searches: {
          filter: { range: { executionTimeMs: { gt: 1000 } } },
        },
      },
    });

    const aggs = response.aggregations as any;
    const percentiles = aggs.execution_time_percentiles.values;

    return {
      averageExecutionTime: Math.round(aggs.execution_time_stats.avg || 0),
      p50ExecutionTime: Math.round(percentiles['50.0'] || 0),
      p90ExecutionTime: Math.round(percentiles['90.0'] || 0),
      p95ExecutionTime: Math.round(percentiles['95.0'] || 0),
      p99ExecutionTime: Math.round(percentiles['99.0'] || 0),
      slowSearchCount: aggs.slow_searches.doc_count,
      minExecutionTime: Math.round(aggs.execution_time_stats.min || 0),
      maxExecutionTime: Math.round(aggs.execution_time_stats.max || 0),
    };
  }

  /**
   * Get search suggestions based on popular queries
   */
  async getQuerySuggestions(partialQuery: string, limit: number = 5): Promise<string[]> {
    const response = await this.elasticsearchService.search({
      index: this.ANALYTICS_INDEX,
      size: 0,
      query: {
        prefix: {
          normalizedQuery: partialQuery.toLowerCase(),
        },
      },
      aggs: {
        suggestions: {
          terms: {
            field: 'normalizedQuery',
            size: limit,
          },
        },
      },
    });

    const buckets = (response.aggregations as any).suggestions.buckets;
    return buckets.map((bucket: any) => bucket.key);
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(
    timeRange: TimeRange,
    format: 'json' | 'csv' = 'json',
  ): Promise<string> {
    const response = await this.elasticsearchService.search({
      index: this.ANALYTICS_INDEX,
      size: 10000,
      query: {
        range: {
          timestamp: {
            gte: timeRange.from,
            lte: timeRange.to,
          },
        },
      },
      sort: [{ timestamp: 'desc' }],
    });

    const hits = response.hits.hits.map((hit: any) => hit._source);

    if (format === 'json') {
      return JSON.stringify(hits, null, 2);
    }

    // CSV format
    if (hits.length === 0) return '';
    const headers = Object.keys(hits[0]);
    const rows = hits.map((hit: any) =>
      headers.map((h) => JSON.stringify(hit[h] || '')).join(','),
    );
    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Normalize a search query for analytics
   */
  private normalizeQuery(query: string): string {
    return query
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '');
  }
}

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface SearchLogParams {
  userId?: string;
  query: string;
  filters?: Record<string, any>;
  resultsCount: number;
  executionTimeMs: number;
  userAgent?: string;
  ipAddress?: string;
  sessionId?: string;
}

export interface TimeRange {
  from: string;
  to: string;
  interval?: string;
}

export interface SearchDashboardData {
  overview: SearchOverviewStats;
  trends: SearchTrend[];
  popularQueries: PopularQuery[];
  failedSearches: FailedSearch[];
}

export interface SearchOverviewStats {
  totalSearches: number;
  uniqueQueries: number;
  uniqueUsers: number;
  averageResultsCount: number;
  averageExecutionTimeMs: number;
  zeroResultsCount: number;
  zeroResultsRate: number;
  clickThroughRate: number;
}

export interface SearchTrend {
  date: string;
  searchCount: number;
  uniqueUsers: number;
  averageResults: number;
}

export interface PopularQuery {
  query: string;
  count: number;
  uniqueUsers: number;
  averageResults: number;
  clickThroughRate: number;
}

export interface FailedSearch {
  query: string;
  searchCount: number;
  averageResults: number;
}

export interface UserSearchHistory {
  query: string;
  filters?: Record<string, any>;
  resultsCount: number;
  timestamp: Date;
}

export interface SearchPerformanceMetrics {
  averageExecutionTime: number;
  p50ExecutionTime: number;
  p90ExecutionTime: number;
  p95ExecutionTime: number;
  p99ExecutionTime: number;
  slowSearchCount: number;
  minExecutionTime: number;
  maxExecutionTime: number;
}
