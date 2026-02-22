// src/gamification/points.service.ts

import { UserGamificationProfile } from './types';

export class PointsService {
  static calculateLevel(xp: number): number {
    return Math.floor(xp / 100) + 1;
  }

  static addPoints(profile: UserGamificationProfile, points: number): UserGamificationProfile {
    const newXP = profile.experience + points;
    const newLevel = this.calculateLevel(newXP);

    return {
      ...profile,
      points: profile.points + points,
      experience: newXP,
      level: newLevel,
    };
  }
}
