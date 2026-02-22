// src/gamification/analytics.service.ts

import { UserGamificationProfile } from './types';

export class GamificationAnalytics {
  static averagePoints(users: UserGamificationProfile[]) {
    const total = users.reduce((sum, u) => sum + u.points, 0);
    return total / users.length;
  }

  static topPerformers(users: UserGamificationProfile[], limit = 5) {
    return [...users].sort((a, b) => b.points - a.points).slice(0, limit);
  }

  static engagementRate(users: UserGamificationProfile[]) {
    return users.filter((u) => u.points > 0).length / users.length;
  }
}
