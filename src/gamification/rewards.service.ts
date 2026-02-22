// src/gamification/rewards.service.ts

import { Reward, UserGamificationProfile } from './types';

export class RewardService {
  constructor(private rewards: Reward[]) {}

  redeem(profile: UserGamificationProfile, rewardId: string): UserGamificationProfile {
    const reward = this.rewards.find((r) => r.id === rewardId);
    if (!reward) throw new Error('Reward not found');

    if (profile.points < reward.cost) throw new Error('Not enough points');

    return {
      ...profile,
      points: profile.points - reward.cost,
    };
  }
}
