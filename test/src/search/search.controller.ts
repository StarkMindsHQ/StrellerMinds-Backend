import { Controller, Get, Post, Delete, UseGuards, UseInterceptors, BadRequestException } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from "@nestjs/swagger"
import type { Request } from "express"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import { OptionalJwtAuthGuard } from "../auth/guards/optional-jwt-auth.guard"
import { RolesGuard } from "../auth/guards/roles.guard"
import { Roles } from "../auth/decorators/roles.decorator"
import { SearchAnalyticsInterceptor } from "./interceptors/search-analytics.interceptor"
import { CacheInterceptor } from "@nestjs/cache-manager"
import type { SearchService } from "./search.service"
import type { SearchDto } from "./dto/search.dto"
import type { AdvancedFilterDto } from "./dto/advanced-filter.dto"
import type { SearchSuggestionDto } from "./dto/search-suggestion.dto"
import type { FacetedSearchDto } from "./dto/faceted-search.dto"
import type { SemanticSearchDto } from "./dto/semantic-search.dto"
import type { SearchExportDto } from "./dto/search-export.dto"
import type { SearchRecommendationDto } from "./dto/search-recommendation.dto"
import type { SaveFilterDto } from "./dto/save-filter.dto"
import type { SearchResult, SearchSuggestion, SearchAnalyticsResult } from "./interfaces/search.interface"

@ApiTags("Search")
@Controller("search")
@UseInterceptors(SearchAnalyticsInterceptor)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({ summary: "Perform full-text search" })
  @ApiResponse({ status: 200, description: "Search results returned successfully" })
  @ApiResponse({ status: 400, description: "Invalid search parameters" })
  async search(searchDto: SearchDto, req: Request): Promise<SearchResult> {
    const userId = req.user?.["id"]
    return this.searchService.search(searchDto, userId)
  }

  @Post("advanced")
  @UseGuards(OptionalJwtAuthGuard)
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({ summary: "Perform advanced search with filters" })
  @ApiResponse({ status: 200, description: "Advanced search results returned successfully" })
  async advancedSearch(filterDto: AdvancedFilterDto, req: Request): Promise<SearchResult> {
    const userId = req.user?.["id"]
    return this.searchService.advancedSearch(filterDto, userId)
  }

  @Post("faceted")
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: "Perform faceted search" })
  @ApiResponse({ status: 200, description: "Faceted search results returned successfully" })
  async facetedSearch(facetDto: FacetedSearchDto, req: Request) {
    const userId = req.user?.["id"]
    return this.searchService.facetedSearch(facetDto, userId)
  }

  @Post("semantic")
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: "Perform semantic search using AI embeddings" })
  @ApiResponse({ status: 200, description: "Semantic search results returned successfully" })
  async semanticSearch(semanticDto: SemanticSearchDto, req: Request): Promise<SearchResult> {
    const userId = req.user?.["id"]
    return this.searchService.semanticSearch(semanticDto, userId)
  }

  @Get("suggestions")
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({ summary: "Get search suggestions" })
  @ApiResponse({ status: 200, description: "Search suggestions returned successfully" })
  async getSuggestions(suggestionDto: SearchSuggestionDto): Promise<{ suggestions: SearchSuggestion[] }> {
    return this.searchService.getSuggestions(suggestionDto)
  }

  @Post("recommendations")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Get personalized course recommendations" })
  @ApiResponse({ status: 200, description: "Recommendations returned successfully" })
  @ApiBearerAuth()
  async getRecommendations(recommendationDto: SearchRecommendationDto, req: Request): Promise<SearchResult> {
    const userId = req.user["id"]
    return this.searchService.getRecommendations(recommendationDto, userId)
  }

  @Post("export")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Export search results" })
  @ApiResponse({ status: 200, description: "Export initiated successfully" })
  @ApiBearerAuth()
  async exportSearchResults(exportDto: SearchExportDto, req: Request): Promise<{ downloadUrl: string }> {
    const userId = req.user["id"]
    return this.searchService.exportSearchResults(exportDto, userId)
  }

  @Post("filters")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Save search filter" })
  @ApiResponse({ status: 201, description: "Filter saved successfully" })
  @ApiBearerAuth()
  async saveSearchFilter(saveFilterDto: SaveFilterDto, req: Request) {
    const userId = req.user["id"]
    return this.searchService.saveSearchFilter(userId, saveFilterDto.name, saveFilterDto.filterData)
  }

  @Get("filters")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Get user saved filters" })
  @ApiResponse({ status: 200, description: "Filters returned successfully" })
  @ApiBearerAuth()
  async getUserSearchFilters(req: Request) {
    const userId = req.user["id"]
    return this.searchService.getUserSearchFilters(userId)
  }

  @Delete("filters/:filterId")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Delete saved filter" })
  @ApiResponse({ status: 200, description: "Filter deleted successfully" })
  @ApiBearerAuth()
  async deleteSearchFilter(filterId: string, req: Request) {
    // Implementation would be added to service
    return { success: true }
  }

  @Get("analytics")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin", "instructor")
  @ApiOperation({ summary: "Get search analytics" })
  @ApiResponse({ status: 200, description: "Analytics returned successfully" })
  @ApiBearerAuth()
  @ApiQuery({ name: "startDate", required: false, type: String })
  @ApiQuery({ name: "endDate", required: false, type: String })
  @ApiQuery({ name: "userId", required: false, type: String })
  async getSearchAnalytics(
    req: Request,
    startDate?: string,
    endDate?: string,
    userId?: string,
  ): Promise<SearchAnalyticsResult> {
    const params: any = {}

    if (startDate) {
      const parsedStartDate = new Date(startDate)
      if (isNaN(parsedStartDate.getTime())) {
        throw new BadRequestException("Invalid start date format")
      }
      params.startDate = parsedStartDate
    }

    if (endDate) {
      const parsedEndDate = new Date(endDate)
      if (isNaN(parsedEndDate.getTime())) {
        throw new BadRequestException("Invalid end date format")
      }
      params.endDate = parsedEndDate
    }

    if (userId) {
      params.userId = userId
    }

    return this.searchService.getSearchAnalytics(params)
  }

  @Get("popular-terms")
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({ summary: "Get popular search terms" })
  @ApiResponse({ status: 200, description: "Popular terms returned successfully" })
  async getPopularSearchTerms(limit?: number) {
    return this.searchService.getPopularSearchTerms(limit)
  }

  @Post("track-click")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Track search result click" })
  @ApiResponse({ status: 200, description: "Click tracked successfully" })
  @ApiBearerAuth()
  async trackSearchClick(searchId: string, courseId: string, req: Request) {
    await this.searchService.trackSearchClick(searchId, courseId)
    return { success: true }
  }

  @Get("trending")
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({ summary: "Get trending search topics" })
  @ApiResponse({ status: 200, description: "Trending topics returned successfully" })
  async getTrendingTopics() {
    // Implementation would analyze recent search patterns
    return { trending: [] }
  }

  @Get("autocomplete/:query")
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({ summary: "Get autocomplete suggestions" })
  @ApiResponse({ status: 200, description: "Autocomplete suggestions returned successfully" })
  async getAutocomplete(query: string) {
    return this.searchService.getSuggestions({ query, limit: 10 })
  }

  @Post("feedback")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Submit search feedback" })
  @ApiResponse({ status: 200, description: "Feedback submitted successfully" })
  @ApiBearerAuth()
  async submitSearchFeedback(feedbackDto: { searchId: string; rating: number; comment?: string }, req: Request) {
    // Implementation would save feedback for search improvement
    return { success: true }
  }

  @Get("history")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Get user search history" })
  @ApiResponse({ status: 200, description: "Search history returned successfully" })
  @ApiBearerAuth()
  async getSearchHistory(req: Request) {
    const userId = req.user["id"]
    return this.searchService.getSearchAnalytics({ userId, limit: 50 })
  }

  @Delete("history")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Clear user search history" })
  @ApiResponse({ status: 200, description: "Search history cleared successfully" })
  @ApiBearerAuth()
  async clearSearchHistory(req: Request) {
    // Implementation would clear user's search history
    return { success: true }
  }
}
