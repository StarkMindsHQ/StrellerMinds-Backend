import {
  Injectable,
  type OnModuleInit,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common"
import type { ElasticsearchService } from "@nestjs/elasticsearch"
import { type Repository, Between } from "typeorm"
import type { ConfigService } from "@nestjs/config"
import { Cron, CronExpression } from "@nestjs/schedule"
import type { Course } from "../courses/entities/course.entity"
import type { SearchAnalytics } from "./entities/search-analytics.entity"
import type { SearchCache } from "./entities/search-cache.entity"
import type { SearchFilter } from "./entities/search-filter.entity"
import type { PopularSearch } from "./entities/popular-search.entity"
import type { SearchDto } from "./dto/search.dto"
import type { AdvancedFilterDto } from "./dto/advanced-filter.dto"
import type { SearchSuggestionDto } from "./dto/search-suggestion.dto"
import type { FacetedSearchDto } from "./dto/faceted-search.dto"
import type { SemanticSearchDto } from "./dto/semantic-search.dto"
import type { SearchExportDto } from "./dto/search-export.dto"
import type { SearchRecommendationDto } from "./dto/search-recommendation.dto"
import type { SearchResult, SearchSuggestion, SearchAnalyticsResult, FacetResult } from "./interfaces/search.interface"
import type { SearchRecommendationService } from "./services/search-recommendation.service"
import type { SearchMLService } from "./services/search-ml.service"
import type { SearchExportService } from "./services/search-export.service"
import type { SearchIndexingService } from "./services/search-indexing.service"
import type { CacheService } from "../caching/services/cache.service" // Import the new generic CacheService

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name)
  private readonly indexName = "courses"

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService, // Use the new generic CacheService
    private readonly searchRecommendationService: SearchRecommendationService,
    private readonly searchMLService: SearchMLService,
    private readonly searchExportService: SearchExportService,
    private readonly searchIndexingService: SearchIndexingService,
    private readonly courseRepository: Repository<Course>,
    private readonly searchAnalyticsRepository: Repository<SearchAnalytics>,
    private readonly searchCacheRepository: Repository<SearchCache>,
    private readonly searchFilterRepository: Repository<SearchFilter>,
    private readonly popularSearchRepository: Repository<PopularSearch>,
  ) {}

  async onModuleInit() {
    await this.initializeElasticsearchIndex()
    await this.warmupCache()
    this.logger.log("Search service initialized successfully")
  }

  private async initializeElasticsearchIndex() {
    try {
      const indexExists = await this.elasticsearchService.indices.exists({
        index: this.indexName,
      })

      if (!indexExists.body) {
        await this.createIndex()
        await this.setupIndexMappings()
        await this.bulkIndexExistingCourses()
      }
    } catch (error) {
      this.logger.error("Failed to initialize Elasticsearch index", error)
      throw new InternalServerErrorException("Search service initialization failed")
    }
  }

  private async createIndex() {
    const indexSettings = {
      settings: {
        number_of_shards: 2,
        number_of_replicas: 1,
        analysis: {
          analyzer: {
            course_analyzer: {
              type: "custom",
              tokenizer: "standard",
              filter: ["lowercase", "stop", "stemmer", "synonym_filter"],
            },
            autocomplete_analyzer: {
              type: "custom",
              tokenizer: "autocomplete_tokenizer",
              filter: ["lowercase"],
            },
            search_analyzer: {
              type: "custom",
              tokenizer: "standard",
              filter: ["lowercase", "stop"],
            },
          },
          tokenizer: {
            autocomplete_tokenizer: {
              type: "edge_ngram",
              min_gram: 2,
              max_gram: 20,
              token_chars: ["letter", "digit"],
            },
          },
          filter: {
            synonym_filter: {
              type: "synonym",
              synonyms: [
                "blockchain,distributed ledger",
                "cryptocurrency,crypto,digital currency",
                "smart contract,contract",
                "stellar,xlm",
              ],
            },
          },
        },
      },
    }

    await this.elasticsearchService.indices.create({
      index: this.indexName,
      body: indexSettings,
    })
  }

  private async setupIndexMappings() {
    const mappings = {
      properties: {
        title: {
          type: "text",
          analyzer: "course_analyzer",
          fields: {
            suggest: {
              type: "completion",
              analyzer: "autocomplete_analyzer",
            },
            keyword: {
              type: "keyword",
            },
          },
        },
        description: {
          type: "text",
          analyzer: "course_analyzer",
          fields: {
            suggest: {
              type: "completion",
              analyzer: "autocomplete_analyzer",
            },
          },
        },
        content: {
          type: "text",
          analyzer: "course_analyzer",
        },
        category: {
          type: "keyword",
        },
        subcategory: {
          type: "keyword",
        },
        level: {
          type: "keyword",
        },
        duration: {
          type: "integer",
        },
        price: {
          type: "float",
        },
        instructor: {
          type: "text",
          fields: {
            keyword: {
              type: "keyword",
            },
          },
        },
        tags: {
          type: "keyword",
        },
        skills: {
          type: "keyword",
        },
        prerequisites: {
          type: "keyword",
        },
        language: {
          type: "keyword",
        },
        rating: {
          type: "float",
        },
        enrollmentCount: {
          type: "integer",
        },
        completionRate: {
          type: "float",
        },
        difficulty: {
          type: "keyword",
        },
        format: {
          type: "keyword",
        },
        certification: {
          type: "boolean",
        },
        createdAt: {
          type: "date",
        },
        updatedAt: {
          type: "date",
        },
        publishedAt: {
          type: "date",
        },
        isActive: {
          type: "boolean",
        },
        vector_embedding: {
          type: "dense_vector",
          dims: 384,
        },
        location: {
          type: "geo_point",
        },
      },
    }

    await this.elasticsearchService.indices.putMapping({
      index: this.indexName,
      body: mappings,
    })
  }

  async search(searchDto: SearchDto, userId?: string): Promise<SearchResult> {
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey("search", searchDto, userId)
      const cachedResult = await this.cacheService.get<SearchResult>(cacheKey)
      if (cachedResult) {
        await this.trackSearchAnalytics(searchDto, userId, cachedResult.total, true)
        return cachedResult
      }

      const { query, page = 1, limit = 10, sortBy = "relevance", sortOrder = "desc" } = searchDto

      if (!query || query.trim().length === 0) {
        throw new BadRequestException("Search query cannot be empty")
      }

      const from = (page - 1) * limit
      const searchBody = this.buildSearchQuery(query, sortBy, sortOrder, from, limit)

      // Add user personalization if available
      if (userId) {
        await this.addPersonalizationToQuery(searchBody, userId)
      }

      const response = await this.elasticsearchService.search({
        index: this.indexName,
        body: searchBody,
      })

      const result = this.formatSearchResponse(response, page, limit)

      // Cache the result
      await this.cacheService.set(cacheKey, result, 300) // 5 minutes TTL

      // Track analytics
      await this.trackSearchAnalytics(searchDto, userId, result.total)

      return result
    } catch (error) {
      this.logger.error("Search failed", error)
      if (error instanceof BadRequestException) {
        throw error
      }
      throw new InternalServerErrorException("Search operation failed")
    }
  }

  async advancedSearch(filterDto: AdvancedFilterDto, userId?: string): Promise<SearchResult> {
    try {
      const cacheKey = this.generateCacheKey("advancedSearch", filterDto, userId)
      const cachedResult = await this.cacheService.get<SearchResult>(cacheKey)
      if (cachedResult) {
        return cachedResult
      }

      const searchBody = this.buildAdvancedSearchQuery(filterDto)

      if (userId) {
        await this.addPersonalizationToQuery(searchBody, userId)
      }

      const response = await this.elasticsearchService.search({
        index: this.indexName,
        body: searchBody,
      })

      const result = this.formatSearchResponse(response, filterDto.page, filterDto.limit)

      await this.cacheService.set(cacheKey, result, 600) // 10 minutes TTL
      await this.trackSearchAnalytics(filterDto, userId, result.total)

      return result
    } catch (error) {
      this.logger.error("Advanced search failed", error)
      throw new InternalServerErrorException("Advanced search operation failed")
    }
  }

  async facetedSearch(facetDto: FacetedSearchDto, userId?: string): Promise<SearchResult & { facets: FacetResult[] }> {
    try {
      const cacheKey = this.generateCacheKey("facetedSearch", facetDto, userId)
      const cachedResult = await this.cacheService.get<SearchResult & { facets: FacetResult[] }>(cacheKey)
      if (cachedResult) {
        return cachedResult
      }

      const searchBody = this.buildFacetedSearchQuery(facetDto)

      const response = await this.elasticsearchService.search({
        index: this.indexName,
        body: searchBody,
      })

      const result = this.formatSearchResponse(response, facetDto.page, facetDto.limit)
      const facets = this.extractFacets(response)
      const fullResult = { ...result, facets }

      await this.cacheService.set(cacheKey, fullResult, 300) // 5 minutes TTL
      return fullResult
    } catch (error) {
      this.logger.error("Faceted search failed", error)
      throw new InternalServerErrorException("Faceted search operation failed")
    }
  }

  async semanticSearch(semanticDto: SemanticSearchDto, userId?: string): Promise<SearchResult> {
    try {
      const cacheKey = this.generateCacheKey("semanticSearch", semanticDto, userId)
      const cachedResult = await this.cacheService.get<SearchResult>(cacheKey)
      if (cachedResult) {
        return cachedResult
      }

      // Generate vector embedding for the query
      const queryEmbedding = await this.searchMLService.generateEmbedding(semanticDto.query)

      const searchBody = {
        query: {
          script_score: {
            query: { match_all: {} },
            script: {
              source: "cosineSimilarity(params.query_vector, 'vector_embedding') + 1.0",
              params: { query_vector: queryEmbedding },
            },
          },
        },
        size: semanticDto.limit || 10,
        from: ((semanticDto.page || 1) - 1) * (semanticDto.limit || 10),
      }

      const response = await this.elasticsearchService.search({
        index: this.indexName,
        body: searchBody,
      })

      const result = this.formatSearchResponse(response, semanticDto.page, semanticDto.limit)
      await this.cacheService.set(cacheKey, result, 300) // 5 minutes TTL
      await this.trackSearchAnalytics(semanticDto, userId, result.total)

      return result
    } catch (error) {
      this.logger.error("Semantic search failed", error)
      throw new InternalServerErrorException("Semantic search operation failed")
    }
  }

  async getSuggestions(suggestionDto: SearchSuggestionDto): Promise<{ suggestions: SearchSuggestion[] }> {
    try {
      const cacheKey = this.generateCacheKey("suggestions", suggestionDto)
      const cachedResult = await this.cacheService.get<{ suggestions: SearchSuggestion[] }>(cacheKey)
      if (cachedResult) {
        return cachedResult
      }

      const { query, limit = 10 } = suggestionDto

      if (query.length < 2) {
        return { suggestions: [] }
      }

      const searchBody = {
        suggest: {
          title_suggest: {
            prefix: query,
            completion: {
              field: "title.suggest",
              size: limit,
              skip_duplicates: true,
            },
          },
          description_suggest: {
            prefix: query,
            completion: {
              field: "description.suggest",
              size: limit,
              skip_duplicates: true,
            },
          },
        },
      }

      const response = await this.elasticsearchService.search({
        index: this.indexName,
        body: searchBody,
      })

      const suggestions = this.formatSuggestions(response)
      const result = { suggestions }
      await this.cacheService.set(cacheKey, result, 60) // 1 minute TTL for suggestions
      return result
    } catch (error) {
      this.logger.error("Get suggestions failed", error)
      throw new InternalServerErrorException("Suggestion operation failed")
    }
  }

  async getRecommendations(recommendationDto: SearchRecommendationDto, userId: string): Promise<SearchResult> {
    try {
      const cacheKey = this.generateCacheKey("recommendations", recommendationDto, userId)
      const cachedResult = await this.cacheService.get<SearchResult>(cacheKey)
      if (cachedResult) {
        return cachedResult
      }

      const result = await this.searchRecommendationService.getPersonalizedRecommendations(recommendationDto, userId)
      await this.cacheService.set(cacheKey, result, 3600) // 1 hour TTL for recommendations
      return result
    } catch (error) {
      this.logger.error("Get recommendations failed", error)
      throw new InternalServerErrorException("Recommendation operation failed")
    }
  }

  async exportSearchResults(exportDto: SearchExportDto, userId: string): Promise<{ downloadUrl: string }> {
    try {
      // Export operations are typically not cached as they generate new files
      return await this.searchExportService.exportResults(exportDto, userId)
    } catch (error) {
      this.logger.error("Export search results failed", error)
      throw new InternalServerErrorException("Export operation failed")
    }
  }

  async saveSearchFilter(userId: string, filterName: string, filterData: any): Promise<SearchFilter> {
    try {
      const searchFilter = this.searchFilterRepository.create({
        userId,
        name: filterName,
        filterData,
        isDefault: false,
      })

      const savedFilter = await this.searchFilterRepository.save(searchFilter)
      await this.cacheService.invalidatePattern(`user-filters:${userId}:*`) // Invalidate user's saved filters cache
      return savedFilter
    } catch (error) {
      this.logger.error("Save search filter failed", error)
      throw new InternalServerErrorException("Save filter operation failed")
    }
  }

  async getUserSearchFilters(userId: string): Promise<SearchFilter[]> {
    try {
      const cacheKey = `user-filters:${userId}`
      const cachedFilters = await this.cacheService.get<SearchFilter[]>(cacheKey)
      if (cachedFilters) {
        return cachedFilters
      }

      const filters = await this.searchFilterRepository.find({
        where: { userId },
        order: { createdAt: "DESC" },
      })
      await this.cacheService.set(cacheKey, filters, 3600) // Cache for 1 hour
      return filters
    } catch (error) {
      this.logger.error("Get user search filters failed", error)
      throw new InternalServerErrorException("Get filters operation failed")
    }
  }

  async getSearchAnalytics(params: {
    startDate?: Date
    endDate?: Date
    userId?: string
    limit?: number
  }): Promise<SearchAnalyticsResult> {
    try {
      // Analytics data is often real-time or near-real-time, so caching might be short or not applied
      // For this example, we won't cache this endpoint directly, but underlying data might be cached.
      const { startDate, endDate, userId, limit = 100 } = params

      const queryBuilder = this.searchAnalyticsRepository.createQueryBuilder("analytics")

      if (startDate && endDate) {
        queryBuilder.where("analytics.searchedAt BETWEEN :startDate AND :endDate", {
          startDate,
          endDate,
        })
      }

      if (userId) {
        queryBuilder.andWhere("analytics.userId = :userId", { userId })
      }

      const recentSearches = await queryBuilder.orderBy("analytics.searchedAt", "DESC").limit(limit).getMany()

      // Get popular queries
      const popularQueriesQuery = this.searchAnalyticsRepository
        .createQueryBuilder("analytics")
        .select("analytics.query", "query")
        .addSelect("COUNT(*)", "count")
        .groupBy("analytics.query")
        .orderBy("count", "DESC")
        .limit(20)

      if (startDate && endDate) {
        popularQueriesQuery.where("analytics.searchedAt BETWEEN :startDate AND :endDate", {
          startDate,
          endDate,
        })
      }

      const popularQueries = await popularQueriesQuery.getRawMany()

      return {
        recentSearches,
        popularQueries: popularQueries.map((pq) => ({
          query: pq.query,
          count: Number.parseInt(pq.count),
        })),
      }
    } catch (error) {
      this.logger.error("Get search analytics failed", error)
      throw new InternalServerErrorException("Analytics operation failed")
    }
  }

  async indexCourse(course: Course): Promise<any> {
    try {
      // Generate vector embedding for semantic search
      const embedding = await this.searchMLService.generateEmbedding(course.title + " " + course.description) // Simplified for example

      const document = {
        title: course.title,
        description: course.description,
        content: course.content || "",
        category: course.category,
        subcategory: course.subcategory,
        level: course.level,
        duration: course.duration,
        price: course.price,
        instructor: course.instructor,
        tags: course.tags || [],
        skills: course.skills || [],
        prerequisites: course.prerequisites || [],
        language: course.language || "en",
        rating: course.rating || 0,
        enrollmentCount: course.enrollmentCount || 0,
        completionRate: course.completionRate || 0,
        difficulty: course.difficulty,
        format: course.format,
        certification: course.certification || false,
        createdAt: course.createdAt,
        updatedAt: course.updatedAt,
        publishedAt: course.publishedAt,
        isActive: course.isActive !== false,
        vector_embedding: embedding,
        location: course.location,
      }

      const response = await this.elasticsearchService.index({
        index: this.indexName,
        id: course.id,
        body: document,
      })

      // Invalidate all search-related caches as data has changed
      await this.cacheService.invalidatePattern(`search:*`)
      await this.cacheService.invalidatePattern(`suggestions:*`)
      await this.cacheService.invalidatePattern(`recommendations:*`)
      await this.cacheService.del(`course:${course.id}`) // Invalidate specific course cache if it exists

      return response.body
    } catch (error) {
      this.logger.error("Index course failed", error)
      throw new InternalServerErrorException("Course indexing failed")
    }
  }

  async updateCourse(courseId: string, updateData: Partial<Course>): Promise<any> {
    try {
      // Generate new embedding if content changed
      let embedding
      if (updateData.title || updateData.description || updateData.content) {
        const course = await this.courseRepository.findOne({ where: { id: courseId } })
        if (course) {
          const updatedCourse = { ...course, ...updateData }
          embedding = await this.searchMLService.generateCourseEmbedding(updatedCourse)
        }
      }

      const document = { ...updateData }
      if (embedding) {
        document.vector_embedding = embedding
      }

      const response = await this.elasticsearchService.update({
        index: this.indexName,
        id: courseId,
        body: { doc: document },
      })

      // Invalidate all search-related caches as data has changed
      await this.cacheService.invalidatePattern(`search:*`)
      await this.cacheService.invalidatePattern(`suggestions:*`)
      await this.cacheService.invalidatePattern(`recommendations:*`)
      await this.cacheService.del(`course:${courseId}`) // Invalidate specific course cache

      return response.body
    } catch (error) {
      this.logger.error("Update course failed", error)
      throw new InternalServerErrorException("Course update failed")
    }
  }

  async deleteCourse(courseId: string): Promise<any> {
    try {
      const response = await this.elasticsearchService.delete({
        index: this.indexName,
        id: courseId,
      })

      // Invalidate all search-related caches as data has changed
      await this.cacheService.invalidatePattern(`search:*`)
      await this.cacheService.invalidatePattern(`suggestions:*`)
      await this.cacheService.invalidatePattern(`recommendations:*`)
      await this.cacheService.del(`course:${courseId}`) // Invalidate specific course cache

      return response.body
    } catch (error) {
      this.logger.error("Delete course failed", error)
      throw new InternalServerErrorException("Course deletion failed")
    }
  }

  async bulkIndexCourses(courses: Course[]): Promise<any> {
    try {
      const result = await this.searchIndexingService.bulkIndex(courses)
      // Invalidate all search-related caches after bulk indexing
      await this.cacheService.invalidatePattern(`search:*`)
      await this.cacheService.invalidatePattern(`suggestions:*`)
      await this.cacheService.invalidatePattern(`recommendations:*`)
      // Potentially invalidate specific course caches if needed, but pattern invalidation is broader
      return result
    } catch (error) {
      this.logger.error("Bulk index courses failed", error)
      throw new InternalServerErrorException("Bulk indexing failed")
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async updatePopularSearches() {
    try {
      const popularQueries = await this.searchAnalyticsRepository
        .createQueryBuilder("analytics")
        .select("analytics.query", "query")
        .addSelect("COUNT(*)", "count")
        .where("analytics.searchedAt >= :date", { date: new Date(Date.now() - 24 * 60 * 60 * 1000) })
        .groupBy("analytics.query")
        .orderBy("count", "DESC")
        .limit(100)
        .getRawMany()

      // Clear existing popular searches
      await this.popularSearchRepository.clear()

      // Insert new popular searches
      const popularSearches = popularQueries.map((pq, index) => ({
        query: pq.query,
        searchCount: Number.parseInt(pq.count),
        rank: index + 1,
        updatedAt: new Date(),
      }))

      await this.popularSearchRepository.save(popularSearches)
      await this.cacheService.del("popular-search-terms") // Invalidate cache for popular terms

      this.logger.log(`Updated ${popularSearches.length} popular searches`)
    } catch (error) {
      this.logger.error("Update popular searches failed", error)
    }
  }

  @Cron(CronExpression.EVERY_6_HOURS)
  async optimizeSearchIndex() {
    try {
      await this.elasticsearchService.indices.forcemerge({
        index: this.indexName,
        max_num_segments: 1,
      })

      this.logger.log("Search index optimized successfully")
    } catch (error) {
      this.logger.error("Index optimization failed", error)
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupOldAnalytics() {
    try {
      const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // 90 days ago

      const result = await this.searchAnalyticsRepository.delete({
        searchedAt: Between(new Date(0), cutoffDate),
      })

      this.logger.log(`Cleaned up ${result.affected} old analytics records`)
    } catch (error) {
      this.logger.error("Analytics cleanup failed", error)
    }
  }

  private buildSearchQuery(query: string, sortBy: string, sortOrder: string, from: number, size: number) {
    const searchBody: any = {
      query: {
        bool: {
          must: [
            {
              multi_match: {
                query,
                fields: ["title^3", "description^2", "content", "instructor", "tags", "skills"],
                type: "best_fields",
                fuzziness: "AUTO",
              },
            },
          ],
          filter: [{ term: { isActive: true } }],
        },
      },
      from,
      size,
      highlight: {
        fields: {
          title: {},
          description: {},
          content: {},
        },
      },
      aggs: {
        categories: {
          terms: { field: "category", size: 20 },
        },
        levels: {
          terms: { field: "level", size: 10 },
        },
        instructors: {
          terms: { field: "instructor.keyword", size: 20 },
        },
        price_ranges: {
          range: {
            field: "price",
            ranges: [
              { key: "free", to: 1 },
              { key: "low", from: 1, to: 50 },
              { key: "medium", from: 50, to: 200 },
              { key: "high", from: 200 },
            ],
          },
        },
        duration_ranges: {
          range: {
            field: "duration",
            ranges: [
              { key: "short", to: 60 },
              { key: "medium", from: 60, to: 180 },
              { key: "long", from: 180 },
            ],
          },
        },
      },
    }

    // Add sorting
    if (sortBy !== "relevance") {
      searchBody.sort = this.buildSortClause(sortBy, sortOrder)
    }

    return searchBody
  }

  private buildAdvancedSearchQuery(filterDto: AdvancedFilterDto) {
    const {
      query,
      categories,
      levels,
      priceRange,
      durationRange,
      instructors,
      tags,
      skills,
      language,
      rating,
      format,
      certification,
      sortBy,
      sortOrder,
      page = 1,
      limit = 10,
    } = filterDto

    const must: any[] = []
    const filter: any[] = [{ term: { isActive: true } }]

    if (query) {
      must.push({
        multi_match: {
          query,
          fields: ["title^3", "description^2", "content", "instructor", "tags", "skills"],
          type: "best_fields",
          fuzziness: "AUTO",
        },
      })
    }

    if (categories?.length) {
      filter.push({ terms: { category: categories } })
    }

    if (levels?.length) {
      filter.push({ terms: { level: levels } })
    }

    if (priceRange) {
      const priceFilter: any = { range: { price: {} } }
      if (priceRange.min !== undefined) priceFilter.range.price.gte = priceRange.min
      if (priceRange.max !== undefined) priceFilter.range.price.lte = priceRange.max
      filter.push(priceFilter)
    }

    if (durationRange) {
      const durationFilter: any = { range: { duration: {} } }
      if (durationRange.min !== undefined) durationFilter.range.duration.gte = durationRange.min
      if (durationRange.max !== undefined) durationFilter.range.duration.lte = durationRange.max
      filter.push(durationFilter)
    }

    if (instructors?.length) {
      filter.push({ terms: { "instructor.keyword": instructors } })
    }

    if (tags?.length) {
      filter.push({ terms: { tags: tags } })
    }

    if (skills?.length) {
      filter.push({ terms: { skills: skills } })
    }

    if (language) {
      filter.push({ term: { language } })
    }

    if (rating !== undefined) {
      filter.push({ range: { rating: { gte: rating } } })
    }

    if (format) {
      filter.push({ term: { format } })
    }

    if (certification !== undefined) {
      filter.push({ term: { certification } })
    }

    const searchBody: any = {
      query: {
        bool: {
          must: must.length > 0 ? must : [{ match_all: {} }],
          filter,
        },
      },
      from: (page - 1) * limit,
      size: limit,
      highlight: {
        fields: {
          title: {},
          description: {},
          content: {},
        },
      },
    }

    if (sortBy && sortBy !== "relevance") {
      searchBody.sort = this.buildSortClause(sortBy, sortOrder)
    }

    return searchBody
  }

  private buildFacetedSearchQuery(facetDto: FacetedSearchDto) {
    const searchBody = this.buildAdvancedSearchQuery(facetDto)

    // Add comprehensive aggregations for faceted search
    searchBody.aggs = {
      categories: {
        terms: { field: "category", size: 50 },
        aggs: {
          subcategories: {
            terms: { field: "subcategory", size: 20 },
          },
        },
      },
      levels: {
        terms: { field: "level", size: 10 },
      },
      instructors: {
        terms: { field: "instructor.keyword", size: 50 },
      },
      tags: {
        terms: { field: "tags", size: 100 },
      },
      skills: {
        terms: { field: "skills", size: 100 },
      },
      languages: {
        terms: { field: "language", size: 20 },
      },
      formats: {
        terms: { field: "format", size: 10 },
      },
      price_stats: {
        stats: { field: "price" },
      },
      duration_stats: {
        stats: { field: "duration" },
      },
      rating_ranges: {
        range: {
          field: "rating",
          ranges: [
            { key: "4_and_above", from: 4 },
            { key: "3_and_above", from: 3 },
            { key: "2_and_above", from: 2 },
            { key: "1_and_above", from: 1 },
          ],
        },
      },
      certification: {
        terms: { field: "certification" },
      },
    }

    return searchBody
  }

  private buildSortClause(sortBy: string, sortOrder = "desc") {
    const sortMap = {
      price: { price: { order: sortOrder } },
      duration: { duration: { order: sortOrder } },
      rating: { rating: { order: sortOrder } },
      enrollmentCount: { enrollmentCount: { order: sortOrder } },
      createdAt: { createdAt: { order: sortOrder } },
      updatedAt: { updatedAt: { order: sortOrder } },
      title: { "title.keyword": { order: sortOrder } },
      instructor: { "instructor.keyword": { order: sortOrder } },
    }

    return [sortMap[sortBy] || { _score: { order: "desc" } }]
  }

  private formatSearchResponse(response: any, page: number, limit: number): SearchResult {
    const hits = response.body.hits
    const courses = hits.hits.map((hit: any) => ({
      ...hit._source,
      id: hit._id,
      score: hit._score,
      highlights: hit.highlight,
    }))

    return {
      courses,
      total: hits.total.value,
      page,
      limit,
      totalPages: Math.ceil(hits.total.value / limit),
      aggregations: response.body.aggregations,
    }
  }

  private formatSuggestions(response: any): SearchSuggestion[] {
    const suggestions: SearchSuggestion[] = []
    const suggest = response.body.suggest

    if (suggest.title_suggest?.[0]?.options) {
      suggest.title_suggest[0].options.forEach((option: any) => {
        suggestions.push({
          text: option.text,
          score: option._score,
          source: "title",
        })
      })
    }

    if (suggest.description_suggest?.[0]?.options) {
      suggest.description_suggest[0].options.forEach((option: any) => {
        suggestions.push({
          text: option.text,
          score: option._score,
          source: "description",
        })
      })
    }

    return suggestions.sort((a, b) => b.score - a.score)
  }

  private extractFacets(response: any): FacetResult[] {
    const facets: FacetResult[] = []
    const aggregations = response.body.aggregations

    Object.keys(aggregations).forEach((key) => {
      const agg = aggregations[key]
      if (agg.buckets) {
        facets.push({
          name: key,
          buckets: agg.buckets.map((bucket: any) => ({
            key: bucket.key,
            count: bucket.doc_count,
            selected: false,
          })),
        })
      }
    })

    return facets
  }

  private generateCacheKey(prefix: string, searchParams: any, userId?: string): string {
    const paramsString = JSON.stringify(searchParams)
    const userSuffix = userId ? `:user:${userId}` : ""
    return `${prefix}:${paramsString}${userSuffix}`
  }

  private async addPersonalizationToQuery(searchBody: any, userId: string) {
    try {
      const userPreferences = await this.searchRecommendationService.getUserPreferences(userId)

      if (userPreferences) {
        // Boost preferred categories
        if (userPreferences.preferredCategories?.length) {
          searchBody.query.bool.should = searchBody.query.bool.should || []
          searchBody.query.bool.should.push({
            terms: {
              category: userPreferences.preferredCategories,
              boost: 1.5,
            },
          })
        }

        // Boost preferred instructors
        if (userPreferences.preferredInstructors?.length) {
          searchBody.query.bool.should = searchBody.query.bool.should || []
          searchBody.query.bool.should.push({
            terms: {
              "instructor.keyword": userPreferences.preferredInstructors,
              boost: 1.3,
            },
          })
        }
      }
    } catch (error) {
      this.logger.warn("Failed to add personalization to query", error)
    }
  }

  private async trackSearchAnalytics(searchParams: any, userId?: string, resultsCount = 0, fromCache = false) {
    try {
      const analytics = this.searchAnalyticsRepository.create({
        query: searchParams.query || "",
        userId,
        resultsCount,
        fromCache,
        searchParams: JSON.stringify(searchParams),
        searchedAt: new Date(),
      })

      await this.searchAnalyticsRepository.save(analytics)
    } catch (error) {
      this.logger.warn("Failed to track search analytics", error)
    }
  }

  private async warmupCache() {
    try {
      // Warm up cache with popular searches
      const popularSearches = await this.popularSearchRepository.find({
        take: 10,
        order: { searchCount: "DESC" },
      })

      for (const search of popularSearches) {
        const searchDto: SearchDto = { query: search.query, page: 1, limit: 10 }
        await this.search(searchDto)
      }

      this.logger.log("Search cache warmed up successfully")
    } catch (error) {
      this.logger.warn("Failed to warm up cache", error)
    }
  }

  private async bulkIndexExistingCourses() {
    try {
      const courses = await this.courseRepository.find({
        where: { isActive: true },
        take: 1000,
      })

      if (courses.length > 0) {
        await this.bulkIndexCourses(courses)
        this.logger.log(`Bulk indexed ${courses.length} existing courses`)
      }
    } catch (error) {
      this.logger.warn("Failed to bulk index existing courses", error)
    }
  }

  async getPopularSearchTerms(limit = 20): Promise<{ query: string; searchCount: number }[]> {
    const cacheKey = `popular-search-terms:${limit}`
    const cachedTerms = await this.cacheService.get<{ query: string; searchCount: number }[]>(cacheKey)
    if (cachedTerms) {
      return cachedTerms
    }

    const popularTerms = await this.popularSearchRepository.find({
      take: limit,
      order: { searchCount: "DESC" },
    })
    const result = popularTerms.map((term) => ({
      query: term.query,
      searchCount: term.searchCount,
    }))
    await this.cacheService.set(cacheKey, result, 3600) // Cache for 1 hour
    return result
  }

  async trackSearchClick(searchId: string, courseId: string): Promise<void> {
    try {
      const searchAnalytic = await this.searchAnalyticsRepository.findOne({
        where: { id: searchId },
      })

      if (!searchAnalytic) {
        throw new BadRequestException("Search analytics record not found.")
      }

      if (!searchAnalytic.clickedResults.includes(courseId)) {
        searchAnalytic.clickedResults.push(courseId)
        await this.searchAnalyticsRepository.save(searchAnalytic)
      }
    } catch (error) {
      this.logger.error("Track search click failed", error)
      if (error instanceof BadRequestException) {
        throw error
      }
      throw new InternalServerErrorException("Failed to track search click")
    }
  }
}
