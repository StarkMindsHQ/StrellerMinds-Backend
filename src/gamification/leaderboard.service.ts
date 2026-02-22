// src/gamification/leaderboard.service.ts

import { UserGamificationProfile } from './types';

export class LeaderboardService {
  static getLeaderboard(users: UserGamificationProfile[]): UserGamificationProfile[] {
    return [...users].sort((a, b) => b.points - a.points);
  }
}
