import { IsString, IsOptional, IsArray, IsInt, Min, Max, IsEnum, IsObject, ValidateNested, IsBoolean, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Date Range Filter DTO
 */
export class DateRangeFilterDto {
  @IsString()
  field: string;

  @IsString()
  from: string;

  @IsString()
  to: string;
}

/**
 * Numeric Range Filter DTO
 */
export class NumericRangeFilterDto {
  @IsString()
  field: string;

  @IsOptional()
  @IsNumber()
  gte?: number;

  @IsOptional()
  @IsNumber()
  lte?: number;

  @IsOptional()
  @IsNumber()
  gt?: number;

  @IsOptional()
  @IsNumber()
  lt?: number;
}

/**
 * Geo Location Filter DTO
 */
export class GeoLocationFilterDto {
  @IsString()
  field: string;

  @IsNumber()
  lat: number;

  @IsNumber()
  lon: number;

  @IsString()
  distance: string;
}

/**
 * Sort Option DTO
 */
export class SortOptionDto {
  @IsString()
  field: string;

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @IsEnum(['_first', '_last'])
  missing?: '_first' | '_last' = '_last';
}

/**
 * Aggregation Config DTO
 */
export class AggregationConfigDto {
  @IsString()
  name: string;

  @IsEnum(['terms', 'range', 'date_histogram', 'nested', 'stats', 'cardinality'])
  type: 'terms' | 'range' | 'date_histogram' | 'nested' | 'stats' | 'cardinality';

  @IsString()
  field: string;

  @IsOptional()
  @IsInt()
  size?: number;

  @IsOptional()
  @IsInt()
  minDocCount?: number;

  @IsOptional()
  @IsString()
  interval?: string;

  @IsOptional()
  @IsString()
  path?: string;
}

/**
 * Advanced Search Query DTO
 */
export class AdvancedSearchQueryDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;

  @IsOptional()
  @ValidateNested()
  @Type(() => DateRangeFilterDto)
  dateRange?: DateRangeFilterDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NumericRangeFilterDto)
  numericRanges?: NumericRangeFilterDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => GeoLocationFilterDto)
  geoLocation?: GeoLocationFilterDto;

  @IsOptional()
  @IsObject()
  boostFields?: Record<string, number>;

  @IsOptional()
  @IsString()
  fuzziness?: string = 'AUTO';

  @IsOptional()
  @IsString()
  minimumShouldMatch?: string = '1';

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SortOptionDto)
  sort?: SortOptionDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AggregationConfigDto)
  aggregations?: AggregationConfigDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  highlightFields?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sourceFields?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  size?: number = 10;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  useOptimization?: boolean = true;

  @IsOptional()
  @IsString()
  userId?: string;
}

/**
 * Search Suggestion DTO
 */
export class SearchSuggestionDto {
  @IsString()
  query: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  @Type(() => Number)
  limit?: number = 5;
}

/**
 * Bulk Index DTO
 */
export class BulkIndexDto {
  @IsArray()
  documents: any[];
}

/**
 * Analytics Time Range DTO
 */
export class AnalyticsTimeRangeDto {
  @IsString()
  from: string;

  @IsString()
  to: string;

  @IsOptional()
  @IsString()
  interval?: string = 'day';
}

/**
 * Track Click DTO
 */
export class TrackClickDto {
  @IsString()
  searchId: string;

  @IsString()
  clickedItemId: string;

  @IsOptional()
  @IsInt()
  position?: number;
}

/**
 * Search Export DTO
 */
export class SearchExportDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;

  @IsOptional()
  @IsEnum(['json', 'csv'])
  format?: 'json' | 'csv' = 'json';
}

/**
 * Query Explanation Response DTO
 */
export class QueryExplanationResponseDto {
  originalQuery: string;
  tokens: string[];
  significantTerms: string[];
  stopWords: string[];
  detectedIntent: string;
  willUseSynonyms: boolean;
  willApplySpellCheck: boolean;
}

/**
 * Optimized Query Response DTO
 */
export class OptimizedQueryResponseDto {
  originalQuery: string;
  optimizedQuery: string;
  expandedTerms: string[];
  significantTerms: string[];
  corrections: Array<{
    original: string;
    corrected: string;
    confidence: number;
  }>;
  suggestions: string[];
  intent: string;
}

/**
 * Search Analytics Dashboard Response DTO
 */
export class SearchDashboardResponseDto {
  overview: {
    totalSearches: number;
    uniqueQueries: number;
    uniqueUsers: number;
    averageResultsCount: number;
    averageExecutionTimeMs: number;
    zeroResultsCount: number;
    zeroResultsRate: number;
    clickThroughRate: number;
  };
  trends: Array<{
    date: string;
    searchCount: number;
    uniqueUsers: number;
    averageResults: number;
  }>;
  popularQueries: Array<{
    query: string;
    count: number;
    uniqueUsers: number;
    averageResults: number;
    clickThroughRate: number;
  }>;
  failedSearches: Array<{
    query: string;
    searchCount: number;
    averageResults: number;
  }>;
}

/**
 * Advanced Search Response DTO
 */
export class AdvancedSearchResponseDto {
  items: Array<{
    id: string;
    score: number;
    source: any;
    highlight?: Record<string, string[]>;
  }>;
  total: number;
  page: number;
  size: number;
  totalPages: number;
  aggregations?: any;
  executionTimeMs: number;
  fromCache: boolean;
}
