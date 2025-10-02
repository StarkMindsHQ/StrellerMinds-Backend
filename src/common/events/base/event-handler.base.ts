import { DomainEvent } from './domain-event.base';

export interface EventHandlerMetadata {
  eventType: string;
  handlerName: string;
  version?: string;
  retryPolicy?: {
    maxRetries: number;
    backoffStrategy: 'exponential' | 'linear' | 'fixed';
    initialDelay: number;
  };
}

export abstract class EventHandler<T extends DomainEvent = DomainEvent> {
  abstract readonly metadata: EventHandlerMetadata;

  abstract handle(event: T): Promise<void>;

  protected async handleWithRetry(event: T): Promise<void> {
    const retryPolicy = this.metadata.retryPolicy;

    if (!retryPolicy) {
      return this.handle(event);
    }

    let attempt = 0;
    let lastError: Error;

    while (attempt <= retryPolicy.maxRetries) {
      try {
        await this.handle(event);
        return;
      } catch (error) {
        lastError = error;
        attempt++;

        if (attempt <= retryPolicy.maxRetries) {
          const delay = this.calculateDelay(attempt, retryPolicy);
          await this.sleep(delay);
        }
      }
    }

    throw new Error(
      `Event handler ${this.metadata.handlerName} failed after ${retryPolicy.maxRetries} retries. Last error: ${lastError.message}`,
    );
  }

  private calculateDelay(
    attempt: number,
    retryPolicy: EventHandlerMetadata['retryPolicy'],
  ): number {
    const { backoffStrategy, initialDelay } = retryPolicy;

    switch (backoffStrategy) {
      case 'exponential':
        return initialDelay * Math.pow(2, attempt - 1);
      case 'linear':
        return initialDelay * attempt;
      case 'fixed':
      default:
        return initialDelay;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  protected getEventContext(event: T): any {
    return {
      eventId: event.eventId,
      eventType: event.eventType,
      aggregateId: event.aggregateId,
      aggregateType: event.aggregateType,
      correlationId: event.metadata.correlationId,
      userId: event.metadata.userId,
      timestamp: event.timestamp,
    };
  }
}
