import { Controller, Get, Query, Param, UseGuards, Req } from '@nestjs/common';
import { SearchService } from './services/search.service';
import { RecommendationService } from './services/recommendation.service';
import { SearchQueryDto } from './dto/search.dto';
import { JwtAuthGuard } from '../auth/guards/auth.guard';

@Controller('search')
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly recommendationService: RecommendationService,
  ) {}

  @Get()
  async search(@Query() query: SearchQueryDto, @Req() req) {
    // Extract userId from token if available (optional auth)
    const userId = req.user?.id;
    return this.searchService.search(query, userId);
  }

  @Get('recommendations')
  @UseGuards(JwtAuthGuard)
  async getRecommendations(@Req() req, @Query('limit') limit: number) {
    return this.recommendationService.getPersonalizedRecommendations(
      req.user.id,
      limit ? Number(limit) : 10,
    );
  }

  @Get('similar/:id')
  async getSimilarContent(
    @Param('id') id: string,
    @Query('limit') limit: number,
  ) {
    return this.recommendationService.getSimilarContent(
      id,
      limit ? Number(limit) : 5,
    );
  }
}