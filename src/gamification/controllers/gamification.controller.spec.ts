import { Test, TestingModule } from '@nestjs/testing';
import { GamificationController } from './gamification.controller';
import { AchievementService } from '../services/achievement.service';
import { RewardService } from '../services/reward.service';
import { LeaderboardService } from '../services/leaderboard.service';
import { GamificationEventService } from '../services/gamification-event.service';

describe('GamificationController', () => {
  let controller: GamificationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GamificationController],
      providers: [
        { provide: AchievementService, useValue: {} },
        { provide: RewardService, useValue: {} },
        { provide: LeaderboardService, useValue: {} },
        { provide: GamificationEventService, useValue: {} },
      ],
    }).compile();

    controller = module.get<GamificationController>(GamificationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
