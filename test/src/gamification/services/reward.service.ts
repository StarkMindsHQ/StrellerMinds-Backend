import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reward } from '../entities/reward.entity';
import { UserReward } from '../entities/user-reward.entity';
import { User } from '../../users/entities/user.entity';
import { CreateRewardDto } from '../dto/create-reward.dto';

@Injectable()
export class RewardService {
  constructor(
    @InjectRepository(Reward)
    private rewardRepo: Repository<Reward>,
    @InjectRepository(UserReward)
    private userRewardRepo: Repository<UserReward>,
  ) {}

  async createReward(dto: CreateRewardDto): Promise<Reward> {
    const reward = this.rewardRepo.create(dto);
    return this.rewardRepo.save(reward);
  }

  async getAllRewards(): Promise<Reward[]> {
    return this.rewardRepo.find();
  }

  async grantReward(user: User, rewardId: number): Promise<UserReward> {
    const reward = await this.rewardRepo.findOneBy({ id: rewardId });
    if (!reward) throw new NotFoundException('Reward not found');
    let userReward = await this.userRewardRepo.findOne({
      where: { user: { id: user.id }, reward: { id: rewardId } },
    });
    if (!userReward) {
      userReward = this.userRewardRepo.create({ user, reward });
      await this.userRewardRepo.save(userReward);
    }
    return userReward;
  }

  async getUserRewards(user: User): Promise<UserReward[]> {
    return this.userRewardRepo.find({ where: { user: { id: user.id } }, relations: ['reward'] });
  }
} 