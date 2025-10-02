import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Achievement } from './entities/achievement.entity';
import { Reward } from './entities/reward.entity';
import { UserAchievement } from './entities/user-achievement.entity';
import { UserReward } from './entities/user-reward.entity';
import { LeaderboardEntry } from './entities/leaderboard-entry.entity';
import { GamificationEvent } from './entities/gamification-event.entity';
import { AchievementService } from './services/achievement.service';
import { RewardService } from './services/reward.service';
import { LeaderboardService } from './services/leaderboard.service';
import { GamificationEventService } from './services/gamification-event.service';
import { GamificationController } from './controllers/gamification.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Achievement,
      Reward,
      UserAchievement,
      UserReward,
      LeaderboardEntry,
      GamificationEvent,
    ]),
  ],
  providers: [AchievementService, RewardService, LeaderboardService, GamificationEventService],
  controllers: [GamificationController],
  exports: [AchievementService, RewardService, LeaderboardService, GamificationEventService],
})
export class GamificationModule {}
