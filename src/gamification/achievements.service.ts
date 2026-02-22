// src/gamification/achievements.service.ts

import { Achievement, Badge, UserGamificationProfile } from './types';

export class AchievementService {
  constructor(
    private achievements: Achievement[],
    private badges: Badge[],
  ) {}

  evaluate(profile: UserGamificationProfile) {
    let updatedProfile = { ...profile };

    for (const achievement of this.achievements) {
      if (!profile.achievements.includes(achievement.id) && achievement.condition(profile)) {
        updatedProfile.achievements.push(achievement.id);
        updatedProfile.points += achievement.rewardPoints || 0;
      }
    }

    for (const badge of this.badges) {
      if (!profile.badges.includes(badge.id) && badge.condition(profile)) {
        updatedProfile.badges.push(badge.id);
      }
    }

    return updatedProfile;
  }
}
