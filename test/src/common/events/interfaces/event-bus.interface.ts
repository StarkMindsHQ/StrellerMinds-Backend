import { DomainEvent } from '../base/domain-event.base';
import { EventHandler } from '../base/event-handler.base';

export interface EventSubscription {
  eventType: string;
  handler: EventHandler;
  options?: {
    priority?: number;
    async?: boolean;
    retryPolicy?: {
      maxRetries: number;
      backoffStrategy: 'exponential' | 'linear' | 'fixed';
      initialDelay: number;
    };
  };
}

export interface EventBusMetrics {
  totalEventsPublished: number;
  totalEventsProcessed: number;
  totalEventsFailed: number;
  eventsByType: Record<string, number>;
  handlersByType: Record<string, number>;
  averageProcessingTime: number;
  lastEventTimestamp?: Date;
}

export interface IEventBus {
  /**
   * Publish a single event
   */
  publish(event: DomainEvent): Promise<void>;

  /**
   * Publish multiple events
   */
  publishAll(events: DomainEvent[]): Promise<void>;

  /**
   * Subscribe to events of a specific type
   */
  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: EventHandler<T>,
    options?: EventSubscription['options'],
  ): void;

  /**
   * Unsubscribe from events
   */
  unsubscribe(eventType: string, handler: EventHandler): void;

  /**
   * Get all subscriptions for an event type
   */
  getSubscriptions(eventType: string): EventSubscription[];

  /**
   * Get metrics about event processing
   */
  getMetrics(): EventBusMetrics;

  /**
   * Clear all metrics
   */
  clearMetrics(): void;

  /**
   * Start the event bus
   */
  start(): Promise<void>;

  /**
   * Stop the event bus
   */
  stop(): Promise<void>;

  /**
   * Check if the event bus is running
   */
  isRunning(): boolean;
}
