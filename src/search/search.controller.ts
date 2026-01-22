import { Controller, Get, Post, Body, Query, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { SearchQueryDto, AutoSuggestDto } from './dto/search-query.dto';
import { ContentDocument } from './entities/content.entity';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async search(@Body() searchDto: SearchQueryDto) {
    return this.searchService.search(searchDto);
  }

  @Post('suggest')
  @HttpCode(HttpStatus.OK)
  async autoSuggest(@Body() dto: AutoSuggestDto) {
    return this.searchService.autoSuggest(dto);
  }

  @Post('index')
  async indexContent(@Body() content: ContentDocument) {
    return this.searchService.indexContent(content);
  }

  @Post('bulk-index')
  async bulkIndex(@Body() contents: ContentDocument[]) {
    return this.searchService.bulkIndexContent(contents);
  }

  @Get('analytics')
  async getAnalytics(
    @Query('userId') userId?: string,
    @Query('days') days: number = 30,
  ) {
    return this.searchService.getSearchAnalytics(userId, days);
  }

  @Post('track-click')
  @HttpCode(HttpStatus.OK)
  async trackClick(
    @Body() body: { userId: string; searchId: string; clickedItemId: string },
  ) {
    return this.searchService.trackClick(
      body.userId,
      body.searchId,
      body.clickedItemId,
    );
  }

  @Get('export')
  async exportResults(
    @Query() searchDto: SearchQueryDto,
    @Query('format') format: 'json' | 'csv' = 'json',
  ) {
    return this.searchService.exportSearchResults(searchDto, format);
  }

  @Get('preferences/:userId')
  async getUserPreferences(@Param('userId') userId: string) {
    return this.searchService.getUserPreferences(userId);
  }
}