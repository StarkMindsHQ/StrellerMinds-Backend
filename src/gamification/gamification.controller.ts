import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { GamificationService } from './gamification.service';
import { JwtAuthGuard } from '../auth/guards/auth.guard';

@ApiTags('gamification')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gamification')
export class GamificationController {
  constructor(private readonly gamificationService: GamificationService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user gamification profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  async getMyProfile(@Request() req: any) {
    return this.gamificationService.getProfile(req.user.id);
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Get global leaderboard' })
  @ApiResponse({ status: 200, description: 'Leaderboard retrieved successfully' })
  async getLeaderboard(@Query('limit') limit?: number) {
    return this.gamificationService.getLeaderboard(limit ? +limit : 10);
  }

  @Get('progress')
  @ApiOperation({ summary: 'Get current user level progress' })
  @ApiResponse({ status: 200, description: 'Progress retrieved successfully' })
  async getMyProgress(@Request() req: any) {
    return this.gamificationService.getLevelProgress(req.user.id);
  }

  @Get('share/:badgeCode')
  @ApiOperation({ summary: 'Get shareable message for a badge' })
  @ApiResponse({ status: 200, description: 'Message generated successfully' })
  async getShareMessage(@Request() req: any, @Param('badgeCode') badgeCode: string) {
    const profile = await this.gamificationService.getProfile(req.user.id);
    return {
      message: `I just earned the ${badgeCode} badge on StrellerMinds! I'm now level ${profile.level} with ${profile.xp} XP! 🚀 #StrellerMinds #BlockchainLearning`,
      url: `https://strellerminds.edu/profile/${req.user.id}`,
    };
  }

  @Post('streak/update')
  @ApiOperation({ summary: 'Update daily streak for current user' })
  @ApiResponse({ status: 200, description: 'Streak updated successfully' })
  async updateMyStreak(@Request() req: any) {
    return this.gamificationService.updateStreak(req.user.id);
  }
}
