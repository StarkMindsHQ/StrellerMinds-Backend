/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Controller,
  Get,
  Query,
  UseGuards,
  Post,
  Body,
  Param,
} from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchIndexingService } from './search-indexing.service';
import { SearchQueryDto } from './dto/search-query.dto';
import { SearchResultDto } from './dto/search-result.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('search')
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly searchIndexingService: SearchIndexingService,
  ) {}

  @Get()
  async search(@Query() query: SearchQueryDto): Promise<SearchResultDto> {
    return this.searchService.search(query);
  }

  @Get('suggestions')
  async getSuggestions(@Query('term') term: string): Promise<string[]> {
    return this.searchService.getSearchSuggestions(term);
  }

  @Get('popular')
  async getPopularSearches(
    @Query('limit') limit: number = 10,
  ): Promise<{ term: string; count: number }[]> {
    return this.searchService.getPopularSearchTerms(limit);
  }

  @Post('reindex')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async reindex(): Promise<{ success: boolean; message: string }> {
    try {
      await this.searchIndexingService.reindexAll();
      return {
        success: true,
        message: 'Reindexing completed successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Reindexing failed: ${error.message}`,
      };
    }
  }

  @Post('reindex/courses')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async reindexCourses(): Promise<{ success: boolean; count: number }> {
    try {
      const count = await this.searchIndexingService.indexCourses();
      return { success: true, count };
    } catch (error) {
      return { success: false, count: 0 };
    }
  }

  @Post('reindex/users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async reindexUsers(): Promise<{ success: boolean; count: number }> {
    try {
      const count = await this.searchIndexingService.indexUsers();
      return { success: true, count };
    } catch (error) {
      return { success: false, count: 0 };
    }
  }

  @Post('reindex/forum')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async reindexForum(): Promise<{
    success: boolean;
    counts: { posts: number; topics: number };
  }> {
    try {
      const counts = await this.searchIndexingService.indexForumContent();
      return { success: true, counts };
    } catch (error) {
      return { success: false, counts: { posts: 0, topics: 0 } };
    }
  }

  // Add this endpoint to your search controller
  @Get('test')
  async testSearchFunctionality() {
    return this.searchService.testSearchFunctionality();
  }

  // Add this endpoint to trigger indexing
  @Post('index')
  async indexContent() {
    await this.searchService.indexContent();
    return { success: true, message: 'Content indexed successfully' };
  }
}
