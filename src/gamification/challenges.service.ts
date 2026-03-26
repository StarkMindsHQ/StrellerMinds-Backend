// src/gamification/challenges.service.ts

import { Challenge, UserGamificationProfile } from './types';

export class ChallengeService {
  constructor(private challenges: Challenge[]) {}

  updateProgress(
    profile: UserGamificationProfile,
    key: string,
    increment = 1,
  ): UserGamificationProfile {
    const updatedProfile = { ...profile };

    const challenge = this.challenges.find((c) => c.progressKey === key);

    if (!challenge) return profile;

    const progress = (profile as any)[key] || 0;
    const newProgress = progress + increment;

    (updatedProfile as any)[key] = newProgress;

    if (newProgress >= challenge.goal && !profile.completedChallenges.includes(challenge.id)) {
      updatedProfile.completedChallenges.push(challenge.id);
      updatedProfile.points += challenge.rewardPoints;
    }

    return updatedProfile;
  }
}
