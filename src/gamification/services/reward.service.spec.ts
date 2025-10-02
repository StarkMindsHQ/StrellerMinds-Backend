import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RewardService } from './reward.service';
import { Reward } from '../entities/reward.entity';
import { UserReward } from '../entities/user-reward.entity';

describe('RewardService', () => {
  let service: RewardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RewardService,
        { provide: getRepositoryToken(Reward), useValue: {} },
        { provide: getRepositoryToken(UserReward), useValue: {} },
      ],
    }).compile();

    service = module.get<RewardService>(RewardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
