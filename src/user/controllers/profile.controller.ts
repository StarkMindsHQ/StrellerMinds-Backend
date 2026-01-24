import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/auth.guard';
import { UserProfileService } from '../services/user-profile.service';
import { PortfolioService } from '../services/portfolio.service';
import { AchievementService } from '../services/achievement.service';
import {
  UpdateUserProfileDto,
  UserProfileResponseDto,
  UserProfileWithDetailsDto,
  CreatePortfolioItemDto,
  UpdatePortfolioItemDto,
  PortfolioItemResponseDto,
  ProfileAnalyticsResponseDto,
} from '../dto/profile.dto';

@ApiTags('User Profiles')
@Controller('profiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class UserProfileController {
  constructor(
    private readonly userProfileService: UserProfileService,
    private readonly portfolioService: PortfolioService,
    private readonly achievementService: AchievementService,
  ) {}

  // Profile Endpoints

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  async getMyProfile(@Request() req): Promise<UserProfileResponseDto> {
    return this.userProfileService.getProfileByUserId(req.user.id);
  }

  @Get('me/full')
  @ApiOperation({ summary: 'Get current user profile with all details' })
  @ApiResponse({ status: 200, description: 'Full profile retrieved' })
  async getMyFullProfile(@Request() req): Promise<UserProfileWithDetailsDto> {
    return this.userProfileService.getProfileWithDetails(req.user.id);
  }

  @Put('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  async updateMyProfile(
    @Request() req,
    @Body() updateDto: UpdateUserProfileDto,
  ): Promise<UserProfileResponseDto> {
    return this.userProfileService.updateProfile(req.user.id, updateDto);
  }

  @Get(':userId/profile')
  @ApiOperation({ summary: 'Get user profile by user ID' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  async getUserProfile(
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ): Promise<UserProfileResponseDto> {
    const profile = await this.userProfileService.getProfileByUserId(userId);
    return profile;
  }

  @Get(':profileId')
  @ApiOperation({ summary: 'Get profile by profile ID' })
  @ApiResponse({ status: 200, description: 'Profile retrieved' })
  async getProfile(
    @Param('profileId', new ParseUUIDPipe()) profileId: string,
  ): Promise<UserProfileResponseDto> {
    const profile = await this.userProfileService.getProfileById(profileId);
    return profile;
  }

  @Get(':profileId/analytics')
  @ApiOperation({ summary: 'Get profile analytics' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved' })
  async getAnalytics(
    @Param('profileId', new ParseUUIDPipe()) profileId: string,
    @Request() req,
  ): Promise<ProfileAnalyticsResponseDto> {
    const profile = await this.userProfileService.getProfileById(profileId);
    // Only return analytics if it's the user's own profile
    if (profile.userId !== req.user.id) {
      throw new Error('Unauthorized');
    }
    return this.userProfileService.getAnalytics(req.user.id);
  }

  // Portfolio Endpoints

  @Post('me/portfolio')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create portfolio item' })
  @ApiResponse({ status: 201, description: 'Portfolio item created' })
  async createPortfolioItem(
    @Request() req,
    @Body() createDto: CreatePortfolioItemDto,
  ): Promise<PortfolioItemResponseDto> {
    const profile = await this.userProfileService.getProfileByUserId(req.user.id);
    return this.portfolioService.createPortfolioItem(profile.id, createDto);
  }

  @Get('me/portfolio')
  @ApiOperation({ summary: 'Get my portfolio items' })
  @ApiResponse({ status: 200, description: 'Portfolio items retrieved' })
  async getMyPortfolioItems(
    @Request() req,
    @Query('featured') featured?: boolean,
  ): Promise<PortfolioItemResponseDto[]> {
    const profile = await this.userProfileService.getProfileByUserId(req.user.id);
    if (featured) {
      return this.portfolioService.getFeaturedItems(profile.id);
    }
    return this.portfolioService.getPortfolioItems(profile.id, true);
  }

  @Get(':profileId/portfolio')
  @ApiOperation({ summary: 'Get user portfolio items' })
  @ApiResponse({ status: 200, description: 'Portfolio items retrieved' })
  async getUserPortfolioItems(
    @Param('profileId', new ParseUUIDPipe()) profileId: string,
  ): Promise<PortfolioItemResponseDto[]> {
    return this.portfolioService.getPortfolioItems(profileId, false);
  }

  @Get('portfolio/:itemId')
  @ApiOperation({ summary: 'Get portfolio item details' })
  @ApiResponse({ status: 200, description: 'Portfolio item retrieved' })
  async getPortfolioItem(
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
  ): Promise<PortfolioItemResponseDto> {
    await this.portfolioService.trackPortfolioView(itemId);
    return this.portfolioService.getPortfolioItemById(itemId);
  }

  @Put('portfolio/:itemId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update portfolio item' })
  @ApiResponse({ status: 200, description: 'Portfolio item updated' })
  async updatePortfolioItem(
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
    @Body() updateDto: UpdatePortfolioItemDto,
    @Request() req,
  ): Promise<PortfolioItemResponseDto> {
    // Verify ownership
    const item = await this.portfolioService.getPortfolioItemById(itemId);
    const profile = await this.userProfileService.getProfileById(item.profileId);
    if (profile.userId !== req.user.id) {
      throw new Error('Unauthorized');
    }
    return this.portfolioService.updatePortfolioItem(itemId, updateDto);
  }

  @Delete('portfolio/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete portfolio item' })
  @ApiResponse({ status: 204, description: 'Portfolio item deleted' })
  async deletePortfolioItem(
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
    @Request() req,
  ): Promise<void> {
    // Verify ownership
    const item = await this.portfolioService.getPortfolioItemById(itemId);
    const profile = await this.userProfileService.getProfileById(item.profileId);
    if (profile.userId !== req.user.id) {
      throw new Error('Unauthorized');
    }
    return this.portfolioService.deletePortfolioItem(itemId);
  }

  @Post('portfolio/reorder')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reorder portfolio items' })
  @ApiResponse({ status: 200, description: 'Portfolio items reordered' })
  async reorderPortfolioItems(
    @Request() req,
    @Body() body: { itemIds: string[] },
  ): Promise<PortfolioItemResponseDto[]> {
    const profile = await this.userProfileService.getProfileByUserId(req.user.id);
    return this.portfolioService.reorderPortfolioItems(profile.id, body.itemIds);
  }

  @Get('portfolio/search')
  @ApiOperation({ summary: 'Search portfolio items' })
  @ApiResponse({ status: 200, description: 'Search results' })
  async searchPortfolioItems(
    @Request() req,
    @Query('q') query: string,
  ): Promise<PortfolioItemResponseDto[]> {
    const profile = await this.userProfileService.getProfileByUserId(req.user.id);
    return this.portfolioService.searchPortfolioItems(profile.id, query);
  }

  // Badge Endpoints

  @Get('me/badges')
  @ApiOperation({ summary: 'Get my badges' })
  @ApiResponse({ status: 200, description: 'Badges retrieved' })
  async getMyBadges(@Request() req): Promise<any[]> {
    const profile = await this.userProfileService.getProfileByUserId(req.user.id);
    return this.achievementService.getUserBadges(profile.id);
  }

  @Get(':profileId/badges')
  @ApiOperation({ summary: 'Get user badges' })
  @ApiResponse({ status: 200, description: 'Badges retrieved' })
  async getUserBadges(
    @Param('profileId', new ParseUUIDPipe()) profileId: string,
  ): Promise<any[]> {
    return this.achievementService.getUserBadges(profileId);
  }

  @Get('me/achievements/stats')
  @ApiOperation({ summary: 'Get achievement statistics' })
  @ApiResponse({ status: 200, description: 'Stats retrieved' })
  async getAchievementStats(@Request() req): Promise<any> {
    const profile = await this.userProfileService.getProfileByUserId(req.user.id);
    return this.achievementService.getAchievementStats(profile.id);
  }
}
