import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Badge, BadgeCategory } from './entities/badge.entity';
import { Reward, RewardType } from './entities/reward.entity';

@Injectable()
export class GamificationSeeder implements OnModuleInit {
  constructor(
    @InjectRepository(Badge)
    private badgeRepository: Repository<Badge>,
    @InjectRepository(Reward)
    private rewardRepository: Repository<Reward>,
  ) {}

  async onModuleInit() {
    await this.seedBadges();
    await this.seedRewards();
  }

  private async seedBadges() {
    const badges = [
      {
        code: 'FIRST_LOGIN',
        name: 'Early Bird',
        description: 'Completed your first login',
        category: BadgeCategory.ACHIEVEMENT,
        xpReward: 50,
      },
      {
        code: 'COURSE_COMPLETED_1',
        name: 'Knowledge Seeker',
        description: 'Completed your first course',
        category: BadgeCategory.MILESTONE,
        xpReward: 200,
      },
      {
        code: 'STREAK_7',
        name: 'Dedicated Student',
        description: 'Maintained a 7-day login streak',
        category: BadgeCategory.SOCIAL,
        xpReward: 500,
      },
    ];

    for (const badgeData of badges) {
      const existing = await this.badgeRepository.findOne({ where: { code: badgeData.code } });
      if (!existing) {
        await this.badgeRepository.save(this.badgeRepository.create(badgeData));
      }
    }
  }

  private async seedRewards() {
    const rewards = [
      {
        name: 'Certificate of Excellence',
        description: 'A special certificate for top performers',
        type: RewardType.CERTIFICATE,
        cost: 1000,
      },
      {
        name: 'Exclusive Webinar Access',
        description: 'Access to a private webinar with blockchain experts',
        type: RewardType.ACCESS_CODE,
        cost: 5000,
      },
    ];

    for (const rewardData of rewards) {
      const existing = await this.rewardRepository.findOne({ where: { name: rewardData.name } });
      if (!existing) {
        await this.rewardRepository.save(this.rewardRepository.create(rewardData));
      }
    }
  }
}
