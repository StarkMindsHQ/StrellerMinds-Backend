import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CourseCompletedEvent, AchievementUnlockedEvent } from '../../common/events/domain-events';

@Injectable()
export class UserEventHandlers {
  @OnEvent('course.completed')
  async handleCourseCompleted(event: CourseCompletedEvent) {
    console.log(`User ${event.userId} completed course ${event.courseId}`);
  }

  @OnEvent('achievement.unlocked')
  async handleAchievementUnlocked(event: AchievementUnlockedEvent) {
    console.log(`User ${event.userId} unlocked achievement ${event.achievementId}`);
  }
}
