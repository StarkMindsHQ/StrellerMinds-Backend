import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CourseCompletedEvent, AssignmentSubmittedEvent, AssignmentGradedEvent } from '../../common/events/domain-events';

@Injectable()
export class GamificationEventHandlers {
  @OnEvent('course.completed')
  async handleCourseCompleted(event: CourseCompletedEvent) {
    console.log(`Awarding points to user ${event.userId} for completing course`);
  }

  @OnEvent('assignment.submitted')
  async handleAssignmentSubmitted(event: AssignmentSubmittedEvent) {
    console.log(`Awarding points to user ${event.userId} for submitting assignment`);
  }

  @OnEvent('assignment.graded')
  async handleAssignmentGraded(event: AssignmentGradedEvent) {
    console.log(`Checking achievements for user ${event.userId} after grading`);
  }
}
