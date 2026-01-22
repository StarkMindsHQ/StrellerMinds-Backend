import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import * as natural from 'natural';
import { compareTwoStrings } from 'string-similarity';
import { SearchQueryDto, AutoSuggestDto } from './dto/search-query.dto';
import { ContentDocument, SearchAnalytics, UserPreference } from './entities/content.entity';

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);
  private readonly CONTENT_INDEX = 'content';
  private readonly ANALYTICS_INDEX = 'search_analytics';
  private readonly PREFERENCES_INDEX = 'user_preferences';
  private tokenizer: any;
  private spellCheck: any;

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.tokenizer = new natural.WordTokenizer();
    this.spellCheck = new natural.Spellcheck(['programming', 'javascript', 'python', 'react', 'design']);
  }

  async onModuleInit() {
    await this.createIndices();
    await this.seedSampleData();
  }

  // ============================================
  // INDEX MANAGEMENT
  // ============================================
  async createIndices() {
    try {
      // Content Index
      const contentExists = await this.elasticsearchService.indices.exists({
        index: this.CONTENT_INDEX,
      });

      if (!contentExists) {
        await this.elasticsearchService.indices.create({
          index: this.CONTENT_INDEX,
          body: {
            settings: {
              analysis: {
                analyzer: {
                  custom_analyzer: {
                    type: 'custom',
                    tokenizer: 'standard',
                    filter: ['lowercase', 'asciifolding', 'stop', 'snowball'],
                  },
                },
              },
              number_of_shards: 1,
              number_of_replicas: 0,
            },
            mappings: {
              properties: {
                id: { type: 'keyword' },
                title: {
                  type: 'text',
                  analyzer: 'custom_analyzer',
                  fields: {
                    keyword: { type: 'keyword' },
                    suggest: { type: 'completion' },
                  },
                },
                description: { type: 'text', analyzer: 'custom_analyzer' },
                content: { type: 'text', analyzer: 'custom_analyzer' },
                category: { type: 'keyword' },
                difficulty: { type: 'keyword' },
                duration: { type: 'integer' },
                author: { type: 'keyword' },
                tags: { type: 'keyword' },
                createdAt: { type: 'date' },
                updatedAt: { type: 'date' },
                viewCount: { type: 'integer' },
                rating: { type: 'float' },
              },
            },
          },
        });
        this.logger.log('Content index created');
      }

      // Analytics Index
      const analyticsExists = await this.elasticsearchService.indices.exists({
        index: this.ANALYTICS_INDEX,
      });

      if (!analyticsExists) {
        await this.elasticsearchService.indices.create({
          index: this.ANALYTICS_INDEX,
          body: {
            mappings: {
              properties: {
                userId: { type: 'keyword' },
                query: { type: 'text' },
                filters: { type: 'object', enabled: false },
                resultsCount: { type: 'integer' },
                clickedResults: { type: 'keyword' },
                timestamp: { type: 'date' },
                duration: { type: 'integer' },
              },
            },
          },
        });
        this.logger.log('Analytics index created');
      }

      // Preferences Index
      const preferencesExists = await this.elasticsearchService.indices.exists({
        index: this.PREFERENCES_INDEX,
      });

      if (!preferencesExists) {
        await this.elasticsearchService.indices.create({
          index: this.PREFERENCES_INDEX,
          body: {
            mappings: {
              properties: {
                userId: { type: 'keyword' },
                categories: { type: 'keyword' },
                difficulty: { type: 'keyword' },
                searchHistory: { type: 'text' },
                clickedItems: { type: 'keyword' },
                lastUpdated: { type: 'date' },
              },
            },
          },
        });
        this.logger.log('Preferences index created');
      }
    } catch (error) {
      this.logger.error('Error creating indices', error);
    }
  }

  // ============================================
  // INDEXING
  // ============================================
  async indexContent(content: ContentDocument) {
    try {
      await this.elasticsearchService.index({
        index: this.CONTENT_INDEX,
        id: content.id,
        body: content,
      });
      
      await this.elasticsearchService.indices.refresh({
        index: this.CONTENT_INDEX,
      });

      // Invalidate cache
      await this.cacheManager.del(`search:*`);
      
      return { success: true, id: content.id };
    } catch (error) {
      this.logger.error('Error indexing content', error);
      throw error;
    }
  }

  async bulkIndexContent(contents: ContentDocument[]) {
    const body = contents.flatMap(doc => [
      { index: { _index: this.CONTENT_INDEX, _id: doc.id } },
      doc,
    ]);

    try {
      const result = await this.elasticsearchService.bulk({ body });
      await this.elasticsearchService.indices.refresh({
        index: this.CONTENT_INDEX,
      });
      
      return { success: true, indexed: contents.length, errors: result.errors };
    } catch (error) {
      this.logger.error('Error bulk indexing', error);
      throw error;
    }
  }

  // ============================================
  // FULL-TEXT SEARCH WITH FACETED FILTERING
  // ============================================
  async search(searchDto: SearchQueryDto) {
    const cacheKey = `search:${JSON.stringify(searchDto)}`;
    
    // Check cache
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    const { query, categories, difficulty, minDuration, maxDuration, page, size, sortBy, userId } = searchDto;
    const from = (page - 1) * size;

    // Build query
    const must: any[] = [];
    const filter: any[] = [];

    // Full-text search
    if (query) {
      must.push({
        multi_match: {
          query,
          fields: ['title^3', 'description^2', 'content', 'tags^2'],
          type: 'best_fields',
          fuzziness: 'AUTO',
          operator: 'or',
        },
      });
    }

    // Faceted filters
    if (categories && categories.length > 0) {
      filter.push({ terms: { category: categories } });
    }

    if (difficulty && difficulty.length > 0) {
      filter.push({ terms: { difficulty } });
    }

    if (minDuration !== undefined || maxDuration !== undefined) {
      filter.push({
        range: {
          duration: {
            ...(minDuration !== undefined && { gte: minDuration }),
            ...(maxDuration !== undefined && { lte: maxDuration }),
          },
        },
      });
    }

    // Personalization boost
    let should: any[] = [];
    if (userId) {
      const preferences = await this.getUserPreferences(userId);
      if (preferences) {
        should = [
          { terms: { category: preferences.categories, boost: 1.5 } },
          { terms: { difficulty: preferences.difficulty, boost: 1.3 } },
        ];
      }
    }

    // Sort
    const sort = this.buildSort(sortBy);

    // Execute search
    try {
      const result = await this.elasticsearchService.search({
        index: this.CONTENT_INDEX,
        body: {
          from,
          size,
          query: {
            bool: {
              must: must.length > 0 ? must : { match_all: {} },
              filter,
              should,
            },
          },
          sort,
          highlight: {
            fields: {
              title: { pre_tags: ['<mark>'], post_tags: ['</mark>'] },
              description: { pre_tags: ['<mark>'], post_tags: ['</mark>'] },
              content: { 
                pre_tags: ['<mark>'], 
                post_tags: ['</mark>'],
                fragment_size: 150,
                number_of_fragments: 3,
              },
            },
          },
          aggs: {
            categories: {
              terms: { field: 'category', size: 20 },
            },
            difficulty: {
              terms: { field: 'difficulty', size: 10 },
            },
            duration_stats: {
              stats: { field: 'duration' },
            },
          },
        },
      });

      const response = {
        total: result.hits.total.value,
        page,
        size,
        results: result.hits.hits.map(hit => ({
          id: hit._id,
          score: hit._score,
          ...hit._source,
          highlights: hit.highlight,
        })),
        facets: {
          categories: result.aggregations.categories.buckets,
          difficulty: result.aggregations.difficulty.buckets,
          durationStats: result.aggregations.duration_stats,
        },
      };

      // Cache results
      await this.cacheManager.set(cacheKey, response, 300000); // 5 minutes

      // Track analytics
      if (userId) {
        await this.trackSearch({
          userId,
          query,
          filters: { categories, difficulty, minDuration, maxDuration },
          resultsCount: result.hits.total.value,
          clickedResults: [],
          timestamp: new Date(),
          duration: 0,
        });
      }

      return response;
    } catch (error) {
      this.logger.error('Search error', error);
      throw error;
    }
  }

  // ============================================
  // AUTO-SUGGESTIONS
  // ============================================
  async autoSuggest(dto: AutoSuggestDto) {
    const { query, limit } = dto;

    try {
      // Spell correction
      const correctedQuery = this.correctSpelling(query);

      // Get suggestions from Elasticsearch
      const result = await this.elasticsearchService.search({
        index: this.CONTENT_INDEX,
        body: {
          suggest: {
            title_suggest: {
              prefix: query,
              completion: {
                field: 'title.suggest',
                size: limit,
                skip_duplicates: true,
                fuzzy: {
                  fuzziness: 'AUTO',
                },
              },
            },
          },
          _source: ['title', 'category'],
          size: 0,
        },
      });

      // Get popular searches
      const popularSearches = await this.getPopularSearches(limit);

      return {
        suggestions: result.suggest.title_suggest[0].options.map(opt => ({
          text: opt._source.title,
          category: opt._source.category,
          score: opt._score,
        })),
        correctedQuery: correctedQuery !== query ? correctedQuery : null,
        popularSearches,
      };
    } catch (error) {
      this.logger.error('Auto-suggest error', error);
      throw error;
    }
  }

  correctSpelling(query: string): string {
    const tokens = this.tokenizer.tokenize(query.toLowerCase());
    const corrected = tokens.map(token => {
      const corrections = this.spellCheck.getCorrections(token, 1);
      return corrections.length > 0 ? corrections[0] : token;
    });
    return corrected.join(' ');
  }

  // ============================================
  // SEARCH ANALYTICS
  // ============================================
  async trackSearch(analytics: SearchAnalytics) {
    try {
      await this.elasticsearchService.index({
        index: this.ANALYTICS_INDEX,
        body: analytics,
      });

      // Update user preferences
      await this.updateUserPreferences(analytics.userId, analytics.query);
    } catch (error) {
      this.logger.error('Error tracking search', error);
    }
  }

  async trackClick(userId: string, searchId: string, clickedItemId: string) {
    try {
      await this.elasticsearchService.update({
        index: this.ANALYTICS_INDEX,
        id: searchId,
        body: {
          script: {
            source: 'ctx._source.clickedResults.add(params.itemId)',
            params: { itemId: clickedItemId },
          },
        },
      });

      // Update user preferences
      const preferences = await this.getUserPreferences(userId);
      if (preferences) {
        preferences.clickedItems.push(clickedItemId);
        await this.saveUserPreferences(preferences);
      }
    } catch (error) {
      this.logger.error('Error tracking click', error);
    }
  }

  async getSearchAnalytics(userId?: string, days: number = 30) {
    try {
      const result = await this.elasticsearchService.search({
        index: this.ANALYTICS_INDEX,
        body: {
          query: {
            bool: {
              must: [
                {
                  range: {
                    timestamp: {
                      gte: `now-${days}d/d`,
                    },
                  },
                },
                ...(userId ? [{ term: { userId } }] : []),
              ],
            },
          },
          aggs: {
            top_queries: {
              terms: { field: 'query.keyword', size: 10 },
            },
            avg_results: {
              avg: { field: 'resultsCount' },
            },
            total_searches: {
              value_count: { field: 'userId' },
            },
            queries_over_time: {
              date_histogram: {
                field: 'timestamp',
                calendar_interval: 'day',
              },
            },
          },
          size: 0,
        },
      });

      return {
        topQueries: result.aggregations.top_queries.buckets,
        avgResults: result.aggregations.avg_results.value,
        totalSearches: result.aggregations.total_searches.value,
        queriesOverTime: result.aggregations.queries_over_time.buckets,
      };
    } catch (error) {
      this.logger.error('Error getting analytics', error);
      throw error;
    }
  }

  async getPopularSearches(limit: number = 10) {
    try {
      const result = await this.elasticsearchService.search({
        index: this.ANALYTICS_INDEX,
        body: {
          query: {
            range: {
              timestamp: { gte: 'now-7d/d' },
            },
          },
          aggs: {
            popular: {
              terms: { field: 'query.keyword', size: limit },
            },
          },
          size: 0,
        },
      });

      return result.aggregations.popular.buckets.map(b => b.key);
    } catch (error) {
      return [];
    }
  }

  // ============================================
  // PERSONALIZATION
  // ============================================
  async getUserPreferences(userId: string): Promise<UserPreference | null> {
    try {
      const result = await this.elasticsearchService.get({
        index: this.PREFERENCES_INDEX,
        id: userId,
      });
      return result._source as UserPreference;
    } catch (error) {
      return null;
    }
  }

  async updateUserPreferences(userId: string, query: string) {
    try {
      let preferences = await this.getUserPreferences(userId);

      if (!preferences) {
        preferences = {
          userId,
          categories: [],
          difficulty: [],
          searchHistory: [query],
          clickedItems: [],
          lastUpdated: new Date(),
        };
      } else {
        preferences.searchHistory.push(query);
        if (preferences.searchHistory.length > 100) {
          preferences.searchHistory = preferences.searchHistory.slice(-100);
        }
        preferences.lastUpdated = new Date();
      }

      await this.saveUserPreferences(preferences);
    } catch (error) {
      this.logger.error('Error updating preferences', error);
    }
  }

  async saveUserPreferences(preferences: UserPreference) {
    await this.elasticsearchService.index({
      index: this.PREFERENCES_INDEX,
      id: preferences.userId,
      body: preferences,
    });
  }

  // ============================================
  // EXPORT RESULTS
  // ============================================
  async exportSearchResults(searchDto: SearchQueryDto, format: 'json' | 'csv' = 'json') {
    const results = await this.search({ ...searchDto, size: 1000 });

    if (format === 'json') {
      return {
        format: 'json',
        data: JSON.stringify(results.results, null, 2),
        filename: `search_results_${Date.now()}.json`,
      };
    } else {
      const csv = this.convertToCSV(results.results);
      return {
        format: 'csv',
        data: csv,
        filename: `search_results_${Date.now()}.csv`,
      };
    }
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = ['id', 'title', 'category', 'difficulty', 'duration', 'rating'];
    const rows = data.map(item =>
      headers.map(header => JSON.stringify(item[header] || '')).join(','),
    );

    return [headers.join(','), ...rows].join('\n');
  }

  // ============================================
  // UTILITIES
  // ============================================
  private buildSort(sortBy: string) {
    switch (sortBy) {
      case 'date':
        return [{ createdAt: { order: 'desc' } }];
      case 'popularity':
        return [{ viewCount: { order: 'desc' } }];
      case 'duration':
        return [{ duration: { order: 'asc' } }];
      case 'relevance':
      default:
        return ['_score'];
    }
  }

  // ============================================
  // SEED DATA
  // ============================================
  async seedSampleData() {
    const sampleContent: ContentDocument[] = [
      {
        id: '1',
        title: 'Introduction to React Hooks',
        description: 'Learn the basics of React Hooks including useState and useEffect',
        content: 'React Hooks allow you to use state and lifecycle features in functional components...',
        category: 'Programming',
        difficulty: 'Beginner',
        duration: 30,
        author: 'John Doe',
        tags: ['react', 'javascript', 'hooks'],
        createdAt: new Date(),
        updatedAt: new Date(),
        viewCount: 150,
        rating: 4.5,
      },
      {
        id: '2',
        title: 'Advanced TypeScript Patterns',
        description: 'Deep dive into advanced TypeScript design patterns',
        content: 'TypeScript provides powerful type system features for building robust applications...',
        category: 'Programming',
        difficulty: 'Advanced',
        duration: 60,
        author: 'Jane Smith',
        tags: ['typescript', 'patterns', 'advanced'],
        createdAt: new Date(),
        updatedAt: new Date(),
        viewCount: 89,
        rating: 4.8,
      },
      {
        id: '3',
        title: 'UI/UX Design Principles',
        description: 'Master the fundamentals of user interface and experience design',
        content: 'Good design is about solving problems and creating delightful user experiences...',
        category: 'Design',
        difficulty: 'Intermediate',
        duration: 45,
        author: 'Alice Johnson',
        tags: ['design', 'ui', 'ux'],
        createdAt: new Date(),
        updatedAt: new Date(),
        viewCount: 200,
        rating: 4.7,
      },
    ];

    try {
      await this.bulkIndexContent(sampleContent);
      this.logger.log('Sample data seeded');
    } catch (error) {
      this.logger.error('Error seeding data', error);
    }
  }
}