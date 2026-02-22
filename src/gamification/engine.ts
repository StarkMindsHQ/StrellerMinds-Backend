// src/gamification/engine.ts

import { PointsService } from './point.service';
import { GamificationEvent } from './types';

export class GamificationEngine {
  static handleEvent(profile: any, event: GamificationEvent) {
    switch (event.type) {
      case 'LESSON_COMPLETED':
        return PointsService.addPoints(profile, 10);

      case 'QUIZ_COMPLETED':
        return PointsService.addPoints(profile, 20);

      case 'COURSE_COMPLETED':
        return PointsService.addPoints(profile, 100);

      case 'LOGIN':
        return PointsService.addPoints(profile, 5);

      default:
        return profile;
    }
  }
}
