import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/auth.guard';
import { AchievementService } from '../services/achievement.service';
import { UserProfileService } from '../services/user-profile.service';
import {
  AchievementStatsDto,
  LeaderboardDto,
  AwardBadgeDto,
  BadgeResponseDto,
} from '../dto/achievement.dto';
import { RequestWithUser } from '../../common/types/request.types';
import { UserBadge } from '../entities/user-badge.entity';

@ApiTags('Achievements & Badges')
@Controller('achievements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class AchievementController {
  constructor(
    private readonly achievementService: AchievementService,
    private readonly userProfileService: UserProfileService,
  ) {}

  @Get('badges/all')
  @ApiOperation({ summary: 'Get all badges' })
  @ApiResponse({ status: 200, description: 'Badges retrieved' })
  async getAllBadges(): Promise<BadgeResponseDto[]> {
    return this.achievementService.getAllBadges();
  }

  @Get('badges/:badgeId')
  @ApiOperation({ summary: 'Get badge details' })
  @ApiResponse({ status: 200, description: 'Badge retrieved' })
  async getBadge(
    @Param('badgeId', new ParseUUIDPipe()) badgeId: string,
  ): Promise<BadgeResponseDto> {
    return this.achievementService.getBadgeById(badgeId);
  }

  @Post('me/award')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Award badge to current user (admin only)' })
  @ApiResponse({ status: 201, description: 'Badge awarded' })
  async awardBadge(
    @Request() req: RequestWithUser,
    @Body() awardDto: AwardBadgeDto,
  ): Promise<UserBadge> {
    const profile = await this.userProfileService.getProfileByUserId(req.user!.sub);
    return this.achievementService.awardBadgeToUser(profile.id, awardDto);
  }

  @Get('me/stats')
  @ApiOperation({ summary: 'Get my achievement stats' })
  @ApiResponse({ status: 200, description: 'Stats retrieved' })
  async getMyStats(@Request() req: RequestWithUser): Promise<AchievementStatsDto> {
    const profile = await this.userProfileService.getProfileByUserId(req.user!.sub);
    return this.achievementService.getAchievementStats(profile.id);
  }

  @Get(':userId/stats')
  @ApiOperation({ summary: 'Get user achievement stats' })
  @ApiResponse({ status: 200, description: 'Stats retrieved' })
  async getUserStats(
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ): Promise<AchievementStatsDto> {
    const profile = await this.userProfileService.getProfileByUserId(userId);
    return this.achievementService.getAchievementStats(profile.id);
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Get achievement leaderboard' })
  @ApiResponse({ status: 200, description: 'Leaderboard retrieved' })
  async getLeaderboard(): Promise<LeaderboardDto[]> {
    return this.achievementService.getLeaderboard(50, 0);
  }

  @Get('badges/search')
  @ApiOperation({ summary: 'Search badges' })
  @ApiResponse({ status: 200, description: 'Search results' })
  async searchBadges(): Promise<BadgeResponseDto[]> {
    return this.achievementService.getAllBadges();
  }
}
