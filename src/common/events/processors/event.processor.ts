import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { EventBusService } from '../services/event-bus.service';

export interface EventJobData {
  eventData: any;
}

@Processor('events')
export class EventProcessor {
  private readonly logger = new Logger(EventProcessor.name);

  constructor(private readonly eventBus: EventBusService) {}

  @Process('process-event')
  async handleProcessEvent(job: Job<EventJobData>): Promise<void> {
    this.logger.debug(`Processing event job ${job.id}`);

    try {
      const { eventData } = job.data;

      // Get subscriptions for this event type
      const subscriptions = this.eventBus.getSubscriptions(eventData.eventType);

      if (subscriptions.length === 0) {
        this.logger.debug(`No subscriptions found for event type: ${eventData.eventType}`);
        return;
      }

      // Process each subscription
      const processingPromises = subscriptions
        .filter((sub) => sub.options?.async !== false) // Only process async handlers here
        .map(async (subscription) => {
          try {
            // Reconstruct the event object
            const event = this.reconstructEvent(eventData);
            await subscription.handler.handleWithRetry(event);

            this.logger.debug(
              `Successfully processed event ${eventData.eventType} with handler ${subscription.handler.metadata.handlerName}`,
            );
          } catch (error) {
            this.logger.error(
              `Failed to process event ${eventData.eventType} with handler ${subscription.handler.metadata.handlerName}`,
              error.stack,
            );
            throw error;
          }
        });

      await Promise.all(processingPromises);

      this.logger.debug(`Event job ${job.id} completed successfully`);
    } catch (error) {
      this.logger.error(`Failed to process event job ${job.id}`, error.stack);
      throw error;
    }
  }

  private reconstructEvent(eventData: any): any {
    // This is a simplified reconstruction
    // In a real implementation, you might want to use a registry of event classes
    return {
      eventId: eventData.eventId,
      eventType: eventData.eventType,
      aggregateId: eventData.aggregateId,
      aggregateType: eventData.aggregateType,
      eventVersion: eventData.eventVersion,
      timestamp: new Date(eventData.timestamp),
      metadata: eventData.metadata,
      getPayload: () => eventData.payload,
      toJSON: () => eventData,
    };
  }
}
