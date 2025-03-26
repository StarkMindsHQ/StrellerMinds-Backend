/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import { SearchRepository } from './search.repository';
import { SearchQueryDto } from './dto/search-query.dto';
import {
  SearchResultDto,
  SearchResultItemDto,
  FacetDto,
} from './dto/search-result.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private searchAnalytics: Map<string, number> = new Map();
  private searchIndex: Map<string, SearchResultItemDto[]> = new Map();
  private lastIndexed: Date = null;

  constructor(
    private readonly searchRepository: SearchRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // Method to index content for faster searches
  async indexContent(): Promise<void> {
    this.logger.log('Starting content indexing process');
    const startTime = Date.now();

    try {
      // Index courses
      const courses = await this.searchRepository.getAllCourses();
      this.searchIndex.set('course', courses);

      // Index forum content
      const forumContent = await this.searchRepository.getAllForumContent();
      this.searchIndex.set('forum', forumContent);

      // Index users
      const users = await this.searchRepository.getAllUsers();
      this.searchIndex.set('user', users);

      this.lastIndexed = new Date();
      const processingTimeMs = Date.now() - startTime;

      this.logger.log(
        `Indexing completed in ${processingTimeMs}ms. Items indexed: ${
          courses.length + forumContent.length + users.length
        }`,
      );

      // Emit indexing event
      this.eventEmitter.emit('search.indexed', {
        itemsIndexed: courses.length + forumContent.length + users.length,
        processingTimeMs,
        timestamp: this.lastIndexed,
      });
    } catch (error) {
      this.logger.error(`Error during indexing: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Method to check if search service is working
  async testSearchFunctionality(): Promise<{
    status: string;
    indexStatus: { indexed: boolean; lastIndexed: Date | null };
    testQueries: { query: string; resultCount: number }[];
  }> {
    const testQueries = [
      { query: 'course', type: 'all' as const },
      { query: 'forum', type: 'forum' as const },
      { query: 'user', type: 'user' as const },
    ];

    const results = [];

    for (const testQuery of testQueries) {
      const searchQuery = new SearchQueryDto();
      searchQuery.query = testQuery.query;
      searchQuery.type = testQuery.type;
      searchQuery.page = 1;
      searchQuery.limit = 10;

      const result = await this.search(searchQuery);
      results.push({
        query: testQuery.query,
        resultCount: result.total,
      });
    }

    return {
      status: 'operational',
      indexStatus: {
        indexed: this.lastIndexed !== null,
        lastIndexed: this.lastIndexed,
      },
      testQueries: results,
    };
  }

  async search(searchQuery: SearchQueryDto): Promise<SearchResultDto> {
    const startTime = Date.now();
    this.logger.log(`Processing search query: ${JSON.stringify(searchQuery)}`);

    // Track search analytics
    if (searchQuery.query) {
      this.trackSearchTerm(searchQuery.query);
    }

    let items: SearchResultItemDto[] = [];
    let total = 0;

    // Perform search based on type
    if (searchQuery.type === 'all' || searchQuery.type === 'course') {
      const [courseResults, courseTotal] =
        await this.searchRepository.searchCourses(searchQuery);
      items = [...items, ...courseResults];
      total += courseTotal;
    }

    if (searchQuery.type === 'all' || searchQuery.type === 'forum') {
      const [forumResults, forumTotal] =
        await this.searchRepository.searchForumContent(searchQuery);
      items = [...items, ...forumResults];
      total += forumTotal;
    }

    if (searchQuery.type === 'all' || searchQuery.type === 'user') {
      const [userResults, userTotal] =
        await this.searchRepository.searchUsers(searchQuery);
      items = [...items, ...userResults];
      total += userTotal;
    }

    // Apply additional filters if provided
    if (searchQuery.filters && Object.keys(searchQuery.filters).length > 0) {
      items = this.applyFilters(items, searchQuery.filters);
      total = items.length;
    }

    // Sort by relevance if needed
    if (searchQuery.sortBy === 'relevance') {
      items.sort((a, b) => b.relevanceScore - a.relevanceScore);
    } else if (searchQuery.sortBy === 'date') {
      items.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }

    // Generate facets
    const facets = this.generateFacets(items);

    // Generate suggestions
    const suggestions = this.generateSuggestions(searchQuery.query);

    const processingTimeMs = Date.now() - startTime;

    // Emit search event
    this.eventEmitter.emit('search.performed', {
      query: searchQuery,
      resultCount: items.length,
      processingTimeMs,
      timestamp: new Date(),
    });

    // Paginate results
    const paginatedItems = this.paginateResults(
      items,
      searchQuery.page,
      searchQuery.limit,
    );

    return {
      items: paginatedItems,
      total,
      page: searchQuery.page,
      limit: searchQuery.limit,
      facets,
      suggestions,
      processingTimeMs,
    };
  }

  // Helper method to paginate results
  private paginateResults(
    items: SearchResultItemDto[],
    page: number,
    limit: number,
  ): SearchResultItemDto[] {
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    return items.slice(startIndex, endIndex);
  }

  // Helper method to apply filters
  private applyFilters(
    items: SearchResultItemDto[],
    filters: Record<string, any>,
  ): SearchResultItemDto[] {
    return items.filter((item) => {
      // Check each filter
      for (const [key, value] of Object.entries(filters)) {
        // Handle type filter
        if (key === 'type' && value && item.type !== value) {
          return false;
        }

        // Handle category filter for courses
        if (key === 'category' && value && item.type === 'course') {
          if (item.metadata?.category !== value) {
            return false;
          }
        }

        // Handle rating filter for courses
        if (key === 'rating' && value && item.type === 'course') {
          const rating = item.metadata?.rating ?? 0;

          // Handle rating ranges
          if (value === '4.5 & up' && rating < 4.5) return false;
          if (value === '4.0 - 4.5' && (rating < 4 || rating > 4.49))
            return false;
          if (value === '3.0 - 4.0' && (rating < 3 || rating > 3.99))
            return false;
          if (value === 'Below 3.0' && rating >= 3) return false;
        }

        // Handle date filters
        if (key === 'dateFrom' && value) {
          const itemDate = new Date(item.createdAt).getTime();
          const fromDate = new Date(value).getTime();
          if (itemDate < fromDate) return false;
        }

        if (key === 'dateTo' && value) {
          const itemDate = new Date(item.createdAt).getTime();
          const toDate = new Date(value).getTime();
          if (itemDate > toDate) return false;
        }
      }

      return true;
    });
  }

  async getSearchSuggestions(term: string): Promise<string[]> {
    return this.generateSuggestions(term);
  }

  async getPopularSearchTerms(
    limit: number = 10,
  ): Promise<{ term: string; count: number }[]> {
    const sortedTerms = [...this.searchAnalytics.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([term, count]) => ({ term, count }));

    return sortedTerms;
  }

  // Rest of the methods remain unchanged
  private trackSearchTerm(term: string): void {
    const normalizedTerm = term.toLowerCase().trim();
    if (normalizedTerm.length < 2) return;

    const currentCount = this.searchAnalytics.get(normalizedTerm) || 0;
    this.searchAnalytics.set(normalizedTerm, currentCount + 1);
  }

  private generateFacets(items: SearchResultItemDto[]): FacetDto[] {
    // Generate type facet
    const typeFacet: FacetDto = {
      name: 'type',
      values: [],
    };

    const typeCount = new Map<string, number>();
    items.forEach((item) => {
      const count = typeCount.get(item.type) || 0;
      typeCount.set(item.type, count + 1);
    });

    typeFacet.values = Array.from(typeCount.entries()).map(
      ([value, count]) => ({
        value,
        count,
      }),
    );

    // Generate other facets based on metadata
    const facets: FacetDto[] = [typeFacet];

    // For courses, generate category facet
    const courseItems = items.filter((item) => item.type === 'course');
    if (courseItems.length > 0) {
      const categoryFacet: FacetDto = {
        name: 'category',
        values: [],
      };

      const categoryCount = new Map<string, number>();
      courseItems.forEach((item) => {
        const category = item.metadata?.category;
        if (category) {
          const count = categoryCount.get(category) || 0;
          categoryCount.set(category, count + 1);
        }
      });

      categoryFacet.values = Array.from(categoryCount.entries())
        .filter(([value]) => value !== null)
        .map(([value, count]) => ({
          value,
          count,
        }));

      if (categoryFacet.values.length > 0) {
        facets.push(categoryFacet);
      }
    }

    // For courses, generate rating facet
    if (courseItems.length > 0) {
      const ratingFacet: FacetDto = {
        name: 'rating',
        values: [],
      };

      const ratingRanges = [
        { min: 4.5, max: 5, label: '4.5 & up' },
        { min: 4, max: 4.49, label: '4.0 - 4.5' },
        { min: 3, max: 3.99, label: '3.0 - 4.0' },
        { min: 0, max: 2.99, label: 'Below 3.0' },
      ];

      ratingRanges.forEach((range) => {
        const count = courseItems.filter((item) => {
          const rating = item.metadata?.rating ?? 0;
          return rating >= range.min && rating <= range.max;
        }).length;

        if (count > 0) {
          ratingFacet.values.push({
            value: range.label,
            count,
          });
        }
      });

      if (ratingFacet.values.length > 0) {
        facets.push(ratingFacet);
      }
    }

    return facets;
  }

  private generateSuggestions(query?: string): string[] {
    if (!query || query.length < 3) return [];

    const suggestions: string[] = [];

    if (query.includes('course')) {
      suggestions.push(
        'courses for beginners',
        'advanced courses',
        'popular courses',
      );
    }

    if (query.includes('forum')) {
      suggestions.push(
        'forum discussions',
        'forum topics',
        'recent forum posts',
      );
    }

    if (query.includes('user')) {
      suggestions.push('user profiles', 'top users', 'user contributions');
    }

    suggestions.push(
      `${query} tutorials`,
      `learn ${query}`,
      `${query} certification`,
    );

    return suggestions.slice(0, 5);
  }

  async searchPosts(query: string, page: number, limit: number) {
    // Mock database query (Replace with actual DB logic)
    return {
      message: `Searching for posts with query: ${query}, page: ${page}, limit: ${limit}`,
    };
  }
}
