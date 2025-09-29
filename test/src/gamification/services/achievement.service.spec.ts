import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AchievementService } from './achievement.service';
import { Achievement } from '../entities/achievement.entity';
import { UserAchievement } from '../entities/user-achievement.entity';

describe('AchievementService', () => {
  let service: AchievementService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AchievementService,
        { provide: getRepositoryToken(Achievement), useValue: {} },
        { provide: getRepositoryToken(UserAchievement), useValue: {} },
      ],
    }).compile();

    service = module.get<AchievementService>(AchievementService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
}); 