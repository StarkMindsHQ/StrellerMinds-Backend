import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { UserRegisteredEvent, PaymentProcessedEvent } from '../../common/events/domain-events';

@Injectable()
export class CourseEventHandlers {
  @OnEvent('user.registered')
  async handleUserRegistered(event: UserRegisteredEvent) {
    console.log(`New user ${event.userId} registered, sending course recommendations`);
  }

  @OnEvent('payment.processed')
  async handlePaymentProcessed(event: PaymentProcessedEvent) {
    console.log(`Payment ${event.paymentId} processed for user ${event.userId}`);
  }
}
