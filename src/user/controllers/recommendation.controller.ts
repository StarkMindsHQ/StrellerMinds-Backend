import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { RecommendationService } from '../services/recommendation.service';
import { UserProfileService } from '../services/user-profile.service';
import { JwtAuthGuard } from '../../auth/guards/auth.guard';
import { RequestWithUser } from '../../common/types/request.types';

@ApiTags('Recommendations')
@Controller('recommendations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RecommendationController {
  constructor(
    private readonly recommendationService: RecommendationService,
    private readonly userProfileService: UserProfileService,
  ) {}

  @Get('profiles')
  @ApiOperation({ summary: 'Get profile recommendations' })
  @ApiResponse({ status: 200, description: 'Recommendations retrieved successfully' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getProfileRecommendations(
    @Request() req: RequestWithUser,
    @Query('limit') limit?: number,
  ) {
    const profile = await this.getProfileFromRequest(req);
    return this.recommendationService.getProfileRecommendations(profile.id, limit || 10);
  }

  @Get('content')
  @ApiOperation({ summary: 'Get content recommendations' })
  @ApiResponse({ status: 200, description: 'Content recommendations retrieved' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getContentRecommendations(
    @Request() req: RequestWithUser,
    @Query('limit') limit?: number,
  ) {
    const profile = await this.getProfileFromRequest(req);
    return this.recommendationService.getContentRecommendations(profile.id, limit || 10);
  }

  @Get('people-you-may-know')
  @ApiOperation({ summary: 'Get "People You May Know" recommendations' })
  @ApiResponse({ status: 200, description: 'People recommendations retrieved' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getPeopleYouMayKnow(
    @Request() req: RequestWithUser,
    @Query('limit') limit?: number,
  ) {
    const profile = await this.getProfileFromRequest(req);
    return this.recommendationService.getPeopleYouMayKnow(profile.id, limit || 10);
  }

  @Get('trending')
  @ApiOperation({ summary: 'Get trending profiles' })
  @ApiResponse({ status: 200, description: 'Trending profiles retrieved' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getTrendingProfiles(@Query('limit') limit?: number) {
    return this.recommendationService.getTrendingProfiles(limit || 10);
  }

  private async getProfileFromRequest(req: RequestWithUser): Promise<{ id: string }> {
    const user = req.user;
    if (!user) throw new Error('Unauthorized');
    return this.userProfileService.getProfileByUserId(user.sub);
  }
}
