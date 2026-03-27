import { Injectable, Logger } from '@nestjs/common';
import { EventHandler } from '../../cqrs/decorators/event-handler.decorator';
import { IEventHandler } from '../../cqrs/interfaces/event.interface';
import { UserCreatedEvent } from '../events/user-created.event';
import { NotificationService } from '../../notifications/services/notification.service';
import { AnalyticsService } from '../../analytics/analytics.service';

@Injectable()
@EventHandler(UserCreatedEvent)
export class UserCreatedEventHandler implements IEventHandler<UserCreatedEvent> {
  private readonly logger = new Logger(UserCreatedEventHandler.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  async handle(event: UserCreatedEvent): Promise<void> {
    this.logger.log(`Handling UserCreatedEvent for user: ${event.data.userId}`);

    try {
      await this.notificationService.sendWelcomeEmail(event.data.email);
      
      await this.analyticsService.trackUserRegistration({
        userId: event.data.userId,
        email: event.data.email,
        username: event.data.username,
        role: event.data.role,
        timestamp: event.timestamp,
      });

      this.logger.log(`Successfully processed UserCreatedEvent for user: ${event.data.userId}`);
    } catch (error) {
      this.logger.error(
        `Error processing UserCreatedEvent for user ${event.data.userId}: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }
}
