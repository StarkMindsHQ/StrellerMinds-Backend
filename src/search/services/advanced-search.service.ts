import { Injectable, Logger } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';

/**
 * Advanced search query builder for complex Elasticsearch queries
 * Supports filtering, sorting, aggregations, and query optimization
 */
@Injectable()
export class AdvancedSearchService {
  private readonly logger = new Logger(AdvancedSearchService.name);
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Build an advanced search query with multiple filters and options
   */
  buildAdvancedQuery(options: AdvancedSearchOptions): any {
    const {
      query,
      filters = {},
      dateRange,
      numericRanges = [],
      geoLocation,
      boostFields = {},
      fuzziness = 'AUTO',
      minimumShouldMatch = '1',
    } = options;

    const must: any[] = [];
    const should: any[] = [];
    const mustNot: any[] = [];
    const filter: any[] = [];

    // Main query with boosting
    if (query) {
      const fields = Object.entries(boostFields).length > 0
        ? Object.entries(boostFields).map(([field, boost]) => `${field}^${boost}`)
        : ['title^3', 'description^2', 'content', 'tags^2', 'author^1.5'];

      should.push({
        multi_match: {
          query,
          fields,
          type: 'best_fields',
          fuzziness,
          prefix_length: 1,
          max_expansions: 50,
          minimum_should_match: minimumShouldMatch,
        },
      });

      // Add phrase match for exact matches
      should.push({
        multi_match: {
          query,
          fields,
          type: 'phrase',
          slop: 2,
        },
      });
    }

    // Apply filters
    for (const [field, value] of Object.entries(filters)) {
      if (value === undefined || value === null) continue;

      if (Array.isArray(value)) {
        if (value.length > 0) {
          filter.push({ terms: { [field]: value } });
        }
      } else if (typeof value === 'object') {
        // Nested filter handling
        filter.push(this.buildNestedFilter(field, value));
      } else {
        filter.push({ term: { [field]: value } });
      }
    }

    // Date range filter
    if (dateRange) {
      filter.push({
        range: {
          [dateRange.field]: {
            gte: dateRange.from,
            lte: dateRange.to,
            format: 'strict_date_optional_time',
          },
        },
      });
    }

    // Numeric range filters
    for (const range of numericRanges) {
      const rangeQuery: any = {};
      if (range.gte !== undefined) rangeQuery.gte = range.gte;
      if (range.lte !== undefined) rangeQuery.lte = range.lte;
      if (range.gt !== undefined) rangeQuery.gt = range.gt;
      if (range.lt !== undefined) rangeQuery.lt = range.lt;

      filter.push({ range: { [range.field]: rangeQuery } });
    }

    // Geo location filter
    if (geoLocation) {
      filter.push({
        geo_distance: {
          distance: geoLocation.distance,
          [geoLocation.field]: {
            lat: geoLocation.lat,
            lon: geoLocation.lon,
          },
        },
      });
    }

    // Build the final bool query
    const boolQuery: any = {};
    if (must.length > 0) boolQuery.must = must;
    if (should.length > 0) boolQuery.should = should;
    if (mustNot.length > 0) boolQuery.must_not = mustNot;
    if (filter.length > 0) boolQuery.filter = filter;

    return { bool: boolQuery };
  }

  /**
   * Build sorting configuration
   */
  buildSort(sortOptions: SortOption[]): any[] {
    return sortOptions.map((opt) => ({
      [opt.field]: {
        order: opt.order || 'desc',
        missing: opt.missing || '_last',
        unmapped_type: opt.unmappedType || 'keyword',
      },
    }));
  }

  /**
   * Build aggregations for faceted search
   */
  buildAggregations(aggregationConfig: AggregationConfig[]): any {
    const aggs: any = {};

    for (const config of aggregationConfig) {
      switch (config.type) {
        case 'terms':
          aggs[config.name] = {
            terms: {
              field: config.field,
              size: config.size || 10,
              min_doc_count: config.minDocCount || 1,
              order: config.order || { _count: 'desc' },
            },
          };
          break;

        case 'range':
          aggs[config.name] = {
            range: {
              field: config.field,
              ranges: config.ranges || [],
            },
          };
          break;

        case 'date_histogram':
          aggs[config.name] = {
            date_histogram: {
              field: config.field,
              calendar_interval: config.interval || 'month',
              min_doc_count: config.minDocCount || 1,
            },
          };
          break;

        case 'nested':
          aggs[config.name] = {
            nested: { path: config.path },
            aggs: this.buildAggregations(config.nestedAggs || []),
          };
          break;

        case 'stats':
          aggs[config.name] = {
            stats: { field: config.field },
          };
          break;

        case 'cardinality':
          aggs[config.name] = {
            cardinality: { field: config.field },
          };
          break;
      }
    }

    return aggs;
  }

  /**
   * Build highlight configuration
   */
  buildHighlight(fields: string[], options: HighlightOptions = {}): any {
    const highlightFields: any = {};
    for (const field of fields) {
      highlightFields[field] = {
        fragment_size: options.fragmentSize || 150,
        number_of_fragments: options.numberOfFragments || 3,
        no_match_size: options.noMatchSize || 0,
      };
    }

    return {
      fields: highlightFields,
      pre_tags: options.preTags || ['<mark>'],
      post_tags: options.postTags || ['</mark>'],
      encoder: options.encoder || 'html',
    };
  }

  /**
   * Execute advanced search with caching
   */
  async executeAdvancedSearch(
    index: string,
    options: AdvancedSearchOptions,
    pagination: PaginationOptions = { page: 1, size: 10 },
  ): Promise<AdvancedSearchResult> {
    const cacheKey = this.generateCacheKey(index, options, pagination);
    
    // Try cache first
    const cached = await this.cacheManager.get<AdvancedSearchResult>(cacheKey);
    if (cached) {
      this.logger.debug('Cache hit for search query');
      return { ...cached, fromCache: true };
    }

    const startTime = Date.now();

    try {
      const query = this.buildAdvancedQuery(options);
      const sort = options.sort ? this.buildSort(options.sort) : undefined;
      const aggs = options.aggregations ? this.buildAggregations(options.aggregations) : undefined;
      const highlight = options.highlightFields 
        ? this.buildHighlight(options.highlightFields, options.highlightOptions)
        : undefined;

      const from = (pagination.page - 1) * pagination.size;

      const response = await this.elasticsearchService.search({
        index,
        from,
        size: pagination.size,
        query,
        sort,
        aggs,
        highlight,
        _source: options.sourceFields,
        track_total_hits: true,
      });

      const executionTime = Date.now() - startTime;
      const total = typeof response.hits.total === 'object' 
        ? response.hits.total.value 
        : response.hits.total;

      const result: AdvancedSearchResult = {
        items: response.hits.hits.map((hit: any) => ({
          id: hit._id,
          score: hit._score,
          source: hit._source,
          highlight: hit.highlight,
        })),
        total,
        page: pagination.page,
        size: pagination.size,
        totalPages: Math.ceil(total / pagination.size),
        aggregations: response.aggregations as any,
        executionTimeMs: executionTime,
        fromCache: false,
      };

      // Cache the result
      await this.cacheManager.set(cacheKey, result, this.CACHE_TTL);

      return result;
    } catch (error) {
      this.logger.error('Advanced search failed', error);
      throw error;
    }
  }

  /**
   * Build nested filter
   */
  private buildNestedFilter(path: string, value: any): any {
    return {
      nested: {
        path,
        query: {
          bool: {
            must: Object.entries(value).map(([key, val]) => ({
              term: { [`${path}.${key}`]: val },
            })),
          },
        },
      },
    };
  }

  /**
   * Generate cache key for search query
   */
  private generateCacheKey(
    index: string,
    options: AdvancedSearchOptions,
    pagination: PaginationOptions,
  ): string {
    const keyData = { index, options, pagination };
    return `search:${Buffer.from(JSON.stringify(keyData)).toString('base64')}`;
  }

  /**
   * Clear search cache
   */
  async clearCache(): Promise<void> {
    // Implementation depends on cache manager capabilities
    this.logger.log('Search cache cleared');
  }
}

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface AdvancedSearchOptions {
  query?: string;
  filters?: Record<string, any>;
  dateRange?: DateRangeFilter;
  numericRanges?: NumericRangeFilter[];
  geoLocation?: GeoLocationFilter;
  boostFields?: Record<string, number>;
  fuzziness?: string;
  minimumShouldMatch?: string;
  sort?: SortOption[];
  aggregations?: AggregationConfig[];
  highlightFields?: string[];
  highlightOptions?: HighlightOptions;
  sourceFields?: string[] | boolean;
}

export interface DateRangeFilter {
  field: string;
  from: string;
  to: string;
}

export interface NumericRangeFilter {
  field: string;
  gte?: number;
  lte?: number;
  gt?: number;
  lt?: number;
}

export interface GeoLocationFilter {
  field: string;
  lat: number;
  lon: number;
  distance: string; // e.g., "10km"
}

export interface SortOption {
  field: string;
  order?: 'asc' | 'desc';
  missing?: '_first' | '_last';
  unmappedType?: string;
}

export interface AggregationConfig {
  name: string;
  type: 'terms' | 'range' | 'date_histogram' | 'nested' | 'stats' | 'cardinality';
  field: string;
  size?: number;
  minDocCount?: number;
  order?: any;
  ranges?: Array<{ from?: number; to?: number; key?: string }>;
  interval?: string;
  path?: string;
  nestedAggs?: AggregationConfig[];
}

export interface HighlightOptions {
  fragmentSize?: number;
  numberOfFragments?: number;
  noMatchSize?: number;
  preTags?: string[];
  postTags?: string[];
  encoder?: 'default' | 'html';
}

export interface PaginationOptions {
  page: number;
  size: number;
}

export interface AdvancedSearchResult {
  items: SearchHit[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
  aggregations?: any;
  executionTimeMs: number;
  fromCache: boolean;
}

export interface SearchHit {
  id: string;
  score: number;
  source: any;
  highlight?: Record<string, string[]>;
}
