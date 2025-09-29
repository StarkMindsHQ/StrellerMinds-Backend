import { Controller, Get, Query, Param, Req, UsePipes, ValidationPipe, HttpException, HttpStatus } from '@nestjs/common';
import { AchievementService } from '../services/achievement.service';
import { RewardService } from '../services/reward.service';
import { LeaderboardService } from '../services/leaderboard.service';
import { GamificationEventService } from '../services/gamification-event.service';
import { LeaderboardQueryDto } from '../dto/leaderboard-query.dto';

@Controller('gamification')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class GamificationController {
  constructor(
    private readonly achievementService: AchievementService,
    private readonly rewardService: RewardService,
    private readonly leaderboardService: LeaderboardService,
    private readonly eventService: GamificationEventService,
  ) {}

  @Get('achievements')
  async getAchievements() {
    try {
      return await this.achievementService.getAllAchievements();
    } catch (error) {
      throw new HttpException('Failed to fetch achievements', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('rewards')
  async getRewards() {
    try {
      return await this.rewardService.getAllRewards();
    } catch (error) {
      throw new HttpException('Failed to fetch rewards', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('leaderboard')
  async getLeaderboard(@Query() query: LeaderboardQueryDto) {
    try {
      return await this.leaderboardService.getLeaderboard(query.period, query.limit);
    } catch (error) {
      throw new HttpException('Failed to fetch leaderboard', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('analytics/events')
  async getEvents(@Query('eventType') eventType?: string) {
    try {
      return await this.eventService.getEvents(eventType);
    } catch (error) {
      throw new HttpException('Failed to fetch events', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
} 