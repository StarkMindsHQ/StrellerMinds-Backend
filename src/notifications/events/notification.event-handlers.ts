import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { 
  UserRegisteredEvent, 
  CourseEnrolledEvent, 
  CourseCompletedEvent,
  AssignmentGradedEvent,
  PaymentProcessedEvent 
} from '../../common/events/domain-events';

@Injectable()
export class NotificationEventHandlers {
  @OnEvent('user.registered')
  async handleUserRegistered(event: UserRegisteredEvent) {
    console.log(`Sending welcome email to ${event.email}`);
  }

  @OnEvent('course.enrolled')
  async handleCourseEnrolled(event: CourseEnrolledEvent) {
    console.log(`Sending enrollment confirmation to user ${event.userId}`);
  }

  @OnEvent('course.completed')
  async handleCourseCompleted(event: CourseCompletedEvent) {
    console.log(`Sending completion certificate to user ${event.userId}`);
  }

  @OnEvent('assignment.graded')
  async handleAssignmentGraded(event: AssignmentGradedEvent) {
    console.log(`Notifying user ${event.userId} about graded assignment`);
  }

  @OnEvent('payment.processed')
  async handlePaymentProcessed(event: PaymentProcessedEvent) {
    console.log(`Sending payment receipt to user ${event.userId}`);
  }
}
