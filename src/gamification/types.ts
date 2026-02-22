// src/gamification/types.ts

export type GamificationEventType =
  | 'LESSON_COMPLETED'
  | 'QUIZ_COMPLETED'
  | 'STREAK_DAY'
  | 'COURSE_COMPLETED'
  | 'LOGIN'
  | 'CUSTOM';

export interface GamificationEvent {
  userId: string;
  type: GamificationEventType;
  payload?: Record<string, any>;
  timestamp?: Date;
}

export interface UserGamificationProfile {
  userId: string;
  points: number;
  experience: number;
  level: number;
  badges: string[];
  achievements: string[];
  completedChallenges: string[];
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  condition: (profile: UserGamificationProfile) => boolean;
  rewardPoints?: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: (profile: UserGamificationProfile) => boolean;
}

export interface Challenge {
  id: string;
  name: string;
  description: string;
  goal: number;
  progressKey: string;
  rewardPoints: number;
}

export interface Reward {
  id: string;
  name: string;
  cost: number;
}
