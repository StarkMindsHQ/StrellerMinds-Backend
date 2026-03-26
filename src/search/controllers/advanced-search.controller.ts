import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdvancedSearchService } from '../services/advanced-search.service';
import { SearchAnalyticsService } from '../services/search-analytics.service';
import { SearchOptimizationService } from '../services/search-optimization.service';
import { SearchIndexingService } from '../services/search-indexing.service';
import {
  AdvancedSearchQueryDto,
  SearchSuggestionDto,
  BulkIndexDto,
  AnalyticsTimeRangeDto,
  TrackClickDto,
  SearchExportDto,
} from '../dto/advanced-search.dto';

/**
 * Advanced Search Controller
 * Provides comprehensive search capabilities with filtering, sorting, analytics, and optimization
 */
@ApiTags('Advanced Search')
@ApiBearerAuth()
@Controller('search/advanced')
export class AdvancedSearchController {
  private readonly CONTENT_INDEX = 'content';

  constructor(
    private readonly advancedSearchService: AdvancedSearchService,
    private readonly analyticsService: SearchAnalyticsService,
    private readonly optimizationService: SearchOptimizationService,
    private readonly indexingService: SearchIndexingService,
  ) {}

  /**
   * Execute advanced search with full filtering and sorting capabilities
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Advanced search with filtering, sorting, and aggregations' })
  @ApiResponse({ status: 200, description: 'Search results returned successfully' })
  @ApiResponse({ status: 400, description: 'Invalid search parameters' })
  async advancedSearch(@Body() dto: AdvancedSearchQueryDto) {
    const startTime = Date.now();

    // Optimize query if enabled
    let searchOptions: any = dto;
    if (dto.useOptimization && dto.query) {
      const optimized = await this.optimizationService.optimizeQuery(dto.query);
      searchOptions = {
        ...dto,
        query: optimized.optimizedQuery,
        expandedTerms: optimized.expandedTerms,
      };
    }

    // Execute search
    const result = await this.advancedSearchService.executeAdvancedSearch(
      this.CONTENT_INDEX,
      {
        query: searchOptions.query,
        filters: searchOptions.filters,
        dateRange: searchOptions.dateRange,
        numericRanges: searchOptions.numericRanges,
        geoLocation: searchOptions.geoLocation,
        boostFields: searchOptions.boostFields,
        fuzziness: searchOptions.fuzziness,
        minimumShouldMatch: searchOptions.minimumShouldMatch,
        sort: searchOptions.sort,
        aggregations: searchOptions.aggregations,
        highlightFields: searchOptions.highlightFields,
        sourceFields: searchOptions.sourceFields,
      },
      { page: dto.page || 1, size: dto.size || 10 },
    );

    const executionTime = Date.now() - startTime;

    // Log search for analytics
    await this.analyticsService.logSearch({
      userId: dto.userId,
      query: dto.query || '',
      filters: dto.filters,
      resultsCount: result.total,
      executionTimeMs: executionTime,
    });

    return {
      success: true,
      data: result,
      meta: {
        executionTimeMs: executionTime,
        optimized: dto.useOptimization,
      },
    };
  }

  /**
   * Get search suggestions based on partial query
   */
  @Post('suggest')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get search suggestions for autocomplete' })
  @ApiResponse({ status: 200, description: 'Suggestions returned successfully' })
  async getSuggestions(@Body() dto: SearchSuggestionDto) {
    const suggestions = await this.analyticsService.getQuerySuggestions(
      dto.query,
      dto.limit,
    );

    return {
      success: true,
      data: {
        query: dto.query,
        suggestions,
      },
    };
  }

  /**
   * Optimize a search query
   */
  @Post('optimize')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Optimize a search query with spell check and synonyms' })
  @ApiResponse({ status: 200, description: 'Query optimization results' })
  async optimizeQuery(@Body('query') query: string) {
    const optimized = await this.optimizationService.optimizeQuery(query);

    return {
      success: true,
      data: optimized,
    };
  }

  /**
   * Explain how a query will be processed
   */
  @Post('explain')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Explain how a query will be processed' })
  @ApiResponse({ status: 200, description: 'Query explanation' })
  async explainQuery(@Body('query') query: string) {
    const explanation = this.optimizationService.explainQuery(query);

    return {
      success: true,
      data: explanation,
    };
  }

  /**
   * Get search analytics dashboard
   */
  @Get('analytics/dashboard')
  @ApiOperation({ summary: 'Get search analytics dashboard data' })
  @ApiResponse({ status: 200, description: 'Analytics dashboard data' })
  async getAnalyticsDashboard(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('interval') interval?: string,
  ) {
    const dashboard = await this.analyticsService.getDashboardData({
      from: from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      to: to || new Date().toISOString(),
      interval: interval || 'day',
    });

    return {
      success: true,
      data: dashboard,
    };
  }

  /**
   * Get search performance metrics
   */
  @Get('analytics/performance')
  @ApiOperation({ summary: 'Get search performance metrics' })
  @ApiResponse({ status: 200, description: 'Performance metrics' })
  async getPerformanceMetrics(
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const metrics = await this.analyticsService.getPerformanceMetrics({
      from: from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      to: to || new Date().toISOString(),
    });

    return {
      success: true,
      data: metrics,
    };
  }

  /**
   * Get user's search history
   */
  @Get('history/:userId')
  @ApiOperation({ summary: 'Get user search history' })
  @ApiResponse({ status: 200, description: 'User search history' })
  async getUserSearchHistory(
    @Query('userId') userId: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    const history = await this.analyticsService.getUserSearchHistory(userId, limit);

    return {
      success: true,
      data: history,
    };
  }

  /**
   * Track a click on a search result
   */
  @Post('track-click')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Track a click on a search result' })
  @ApiResponse({ status: 200, description: 'Click tracked successfully' })
  async trackClick(@Body() dto: TrackClickDto) {
    await this.analyticsService.trackResultClick(
      dto.searchId,
      dto.clickedItemId,
      dto.position || 0,
    );

    return {
      success: true,
      message: 'Click tracked successfully',
    };
  }

  /**
   * Export search analytics
   */
  @Get('analytics/export')
  @ApiOperation({ summary: 'Export search analytics data' })
  @ApiResponse({ status: 200, description: 'Analytics data exported' })
  async exportAnalytics(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('format') format: 'json' | 'csv' = 'json',
  ) {
    const data = await this.analyticsService.exportAnalytics(
      {
        from: from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        to: to || new Date().toISOString(),
      },
      format,
    );

    return {
      success: true,
      data,
      meta: { format },
    };
  }

  /**
   * Bulk index documents
   */
  @Post('index/bulk')
  @ApiOperation({ summary: 'Bulk index documents' })
  @ApiResponse({ status: 200, description: 'Documents indexed successfully' })
  async bulkIndex(@Body() dto: BulkIndexDto) {
    const result = await this.indexingService.bulkIndex(dto.documents);

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Update a single document
   */
  @Post('index/update/:id')
  @ApiOperation({ summary: 'Update a document in the search index' })
  @ApiResponse({ status: 200, description: 'Document updated successfully' })
  async updateDocument(@Query('id') id: string, @Body() document: any) {
    await this.indexingService.updateDocument(id, document);

    return {
      success: true,
      message: 'Document updated successfully',
    };
  }

  /**
   * Delete a document from the index
   */
  @Post('index/delete/:id')
  @ApiOperation({ summary: 'Delete a document from the search index' })
  @ApiResponse({ status: 200, description: 'Document deleted successfully' })
  async deleteDocument(@Query('id') id: string) {
    await this.indexingService.deleteDocument(id);

    return {
      success: true,
      message: 'Document deleted successfully',
    };
  }

  /**
   * Get index statistics
   */
  @Get('index/stats')
  @ApiOperation({ summary: 'Get search index statistics' })
  @ApiResponse({ status: 200, description: 'Index statistics' })
  async getIndexStats() {
    const stats = await this.indexingService.getIndexStats();

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Optimize the search index
   */
  @Post('index/optimize')
  @ApiOperation({ summary: 'Optimize the search index' })
  @ApiResponse({ status: 200, description: 'Index optimized successfully' })
  async optimizeIndex(@Query('maxSegments', new DefaultValuePipe(1), ParseIntPipe) maxSegments: number) {
    await this.indexingService.optimizeIndex(maxSegments);

    return {
      success: true,
      message: 'Index optimized successfully',
    };
  }

  /**
   * Refresh the search index
   */
  @Post('index/refresh')
  @ApiOperation({ summary: 'Refresh the search index' })
  @ApiResponse({ status: 200, description: 'Index refreshed successfully' })
  async refreshIndex() {
    await this.indexingService.refreshIndex();

    return {
      success: true,
      message: 'Index refreshed successfully',
    };
  }

  /**
   * Get search quality metrics
   */
  @Get('quality/metrics')
  @ApiOperation({ summary: 'Get search quality metrics' })
  @ApiResponse({ status: 200, description: 'Search quality metrics' })
  async getSearchQualityMetrics() {
    const metrics = await this.optimizationService.getSearchQualityMetrics();

    return {
      success: true,
      data: metrics,
    };
  }
}
