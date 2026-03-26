import { Controller, Get, Post, Body, Query, Param, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
import { SearchQueryDto, AutoSuggestDto } from './dto/search-query.dto';
import { ContentDocument } from './entities/content.entity';
import { SearchService } from './search.service';
import { JwtAuthGuard, Roles } from '../auth/guards/auth.guard';
import { UserRole } from '../auth/entities/user.entity';

@ApiTags('Search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search content', description: 'Performs a full-text search across courses, lessons, and modules using Elasticsearch.' })
  @ApiResponse({ status: 200, description: 'Search results retrieved successfully.' })
  async search(@Body() searchDto: SearchQueryDto) {
    return this.searchService.search(searchDto);
  }

  @Post('suggest')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Auto-suggest search terms', description: 'Provides real-time search suggestions as the user types.' })
  @ApiResponse({ status: 200, description: 'Suggestions retrieved successfully.' })
  async autoSuggest(@Body() dto: AutoSuggestDto) {
    return this.searchService.autoSuggest(dto);
  }

  @Post('index')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Index content', description: 'Manually index a new piece of content into Elasticsearch (Admin only).' })
  @ApiResponse({ status: 201, description: 'Content indexed successfully.' })
  async indexContent(@Body() content: ContentDocument) {
    return this.searchService.indexContent(content);
  }

  @Post('bulk-index')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Bulk index content', description: 'Indexes multiple pieces of content in a single operation (Admin only).' })
  @ApiResponse({ status: 201, description: 'Bulk indexing completed successfully.' })
  async bulkIndex(@Body() contents: ContentDocument[]) {
    return this.searchService.bulkIndexContent(contents);
  }

  @Get('analytics')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get search analytics', description: 'Retrieves trends and metrics about what users are searching for (Admin only).' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by specific user ID' })
  @ApiQuery({ name: 'days', required: false, type: Number, example: 30, description: 'Number of past days to analyze' })
  @ApiResponse({ status: 200, description: 'Analytics data retrieved successfully.' })
  async getAnalytics(@Query('userId') userId?: string, @Query('days') days: number = 30) {
    return this.searchService.getSearchAnalytics(userId, days);
  }

  @Post('track-click')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Track search result clicks', description: 'Records which search results users click on to improve relevance rankings.' })
  @ApiResponse({ status: 200, description: 'Click tracked successfully.' })
  async trackClick(@Body() body: { userId: string; searchId: string; clickedItemId: string }) {
    return this.searchService.trackClick(body.userId, body.searchId, body.clickedItemId);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export search results', description: 'Downloads search results in either JSON or CSV format.' })
  @ApiQuery({ name: 'format', enum: ['json', 'csv'], example: 'csv' })
  @ApiResponse({ status: 200, description: 'File export stream started.' })
  async exportResults(
    @Query() searchDto: SearchQueryDto,
    @Query('format') format: 'json' | 'csv' = 'json',
  ) {
    return this.searchService.exportSearchResults(searchDto, format);
  }

  @Get('preferences/:userId')
  @ApiOperation({ summary: 'Get user search preferences', description: 'Retrieves saved search filters and preferences for a specific user.' })
  @ApiParam({ name: 'userId', example: 'uuid-v4-string' })
  @ApiResponse({ status: 200, description: 'Preferences retrieved successfully.' })
  async getUserPreferences(@Param('userId') userId: string) {
    return this.searchService.getUserPreferences(userId);
  }
}
