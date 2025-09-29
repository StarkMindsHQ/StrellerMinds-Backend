import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { DomainEvent } from '../base/domain-event.base';
import { EventHandler } from '../base/event-handler.base';
import { IEventBus, EventSubscription, EventBusMetrics } from '../interfaces/event-bus.interface';
import { IEventStore } from '../interfaces/event-store.interface';
import { Inject } from '@nestjs/common';

@Injectable()
export class EventBusService implements IEventBus, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventBusService.name);
  private readonly subscriptions = new Map<string, EventSubscription[]>();
  private readonly metrics: EventBusMetrics = {
    totalEventsPublished: 0,
    totalEventsProcessed: 0,
    totalEventsFailed: 0,
    eventsByType: {},
    handlersByType: {},
    averageProcessingTime: 0,
  };
  private isRunning = false;
  private processingTimes: number[] = [];

  constructor(
    private readonly eventEmitter: EventEmitter2,
    @InjectQueue('events') private readonly eventQueue: Queue,
    @Inject('EVENT_STORE') private readonly eventStore: IEventStore,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.start();
  }

  async onModuleDestroy(): Promise<void> {
    await this.stop();
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.logger.log('Starting Event Bus...');
    this.isRunning = true;
    this.logger.log('Event Bus started successfully');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.logger.log('Stopping Event Bus...');
    this.isRunning = false;
    this.logger.log('Event Bus stopped successfully');
  }

  isRunning(): boolean {
    return this.isRunning;
  }

  async publish(event: DomainEvent): Promise<void> {
    if (!this.isRunning) {
      throw new Error('Event Bus is not running');
    }

    try {
      this.logger.debug(`Publishing event: ${event.eventType}`, {
        eventId: event.eventId,
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
      });

      // Store event in event store
      await this.eventStore.appendEvents(
        event.aggregateId,
        event.aggregateType,
        [event],
        {
          correlationId: event.metadata.correlationId,
          causationId: event.metadata.causationId,
        },
      );

      // Emit event for immediate processing
      this.eventEmitter.emit(event.eventType, event);

      // Queue event for async processing
      await this.eventQueue.add(
        'process-event',
        {
          eventData: event.toJSON(),
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      );

      this.updateMetrics(event, 'published');
      this.logger.debug(`Event published successfully: ${event.eventType}`);
    } catch (error) {
      this.logger.error(`Failed to publish event: ${event.eventType}`, error.stack);
      this.updateMetrics(event, 'failed');
      throw error;
    }
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    if (!this.isRunning) {
      throw new Error('Event Bus is not running');
    }

    if (events.length === 0) {
      return;
    }

    try {
      this.logger.debug(`Publishing ${events.length} events`);

      // Group events by aggregate for batch storage
      const eventsByAggregate = new Map<string, DomainEvent[]>();
      
      for (const event of events) {
        const key = `${event.aggregateType}:${event.aggregateId}`;
        if (!eventsByAggregate.has(key)) {
          eventsByAggregate.set(key, []);
        }
        eventsByAggregate.get(key)!.push(event);
      }

      // Store events in batches
      for (const [key, aggregateEvents] of eventsByAggregate) {
        const [aggregateType, aggregateId] = key.split(':');
        await this.eventStore.appendEvents(aggregateId, aggregateType, aggregateEvents);
      }

      // Emit and queue all events
      const queueJobs = events.map(event => ({
        name: 'process-event',
        data: { eventData: event.toJSON() },
        opts: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        },
      }));

      await this.eventQueue.addBulk(queueJobs);

      // Emit events for immediate processing
      for (const event of events) {
        this.eventEmitter.emit(event.eventType, event);
        this.updateMetrics(event, 'published');
      }

      this.logger.debug(`Successfully published ${events.length} events`);
    } catch (error) {
      this.logger.error(`Failed to publish events batch`, error.stack);
      events.forEach(event => this.updateMetrics(event, 'failed'));
      throw error;
    }
  }

  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: EventHandler<T>,
    options?: EventSubscription['options'],
  ): void {
    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, []);
    }

    const subscription: EventSubscription = {
      eventType,
      handler: handler as EventHandler,
      options,
    };

    this.subscriptions.get(eventType)!.push(subscription);

    // Register with EventEmitter2 for immediate processing
    this.eventEmitter.on(eventType, async (event: T) => {
      await this.processEvent(event, handler);
    });

    this.logger.debug(`Subscribed handler ${handler.metadata.handlerName} to event ${eventType}`);
  }

  unsubscribe(eventType: string, handler: EventHandler): void {
    const subscriptions = this.subscriptions.get(eventType);
    if (!subscriptions) {
      return;
    }

    const index = subscriptions.findIndex(sub => sub.handler === handler);
    if (index !== -1) {
      subscriptions.splice(index, 1);
      this.eventEmitter.removeListener(eventType, handler.handle.bind(handler));
      this.logger.debug(`Unsubscribed handler ${handler.metadata.handlerName} from event ${eventType}`);
    }
  }

  getSubscriptions(eventType: string): EventSubscription[] {
    return this.subscriptions.get(eventType) || [];
  }

  getMetrics(): EventBusMetrics {
    return {
      ...this.metrics,
      averageProcessingTime: this.calculateAverageProcessingTime(),
    };
  }

  clearMetrics(): void {
    this.metrics.totalEventsPublished = 0;
    this.metrics.totalEventsProcessed = 0;
    this.metrics.totalEventsFailed = 0;
    this.metrics.eventsByType = {};
    this.metrics.handlersByType = {};
    this.metrics.averageProcessingTime = 0;
    this.processingTimes = [];
    this.logger.debug('Event Bus metrics cleared');
  }

  private async processEvent<T extends DomainEvent>(event: T, handler: EventHandler<T>): Promise<void> {
    const startTime = Date.now();
    
    try {
      await handler.handleWithRetry(event);
      
      const processingTime = Date.now() - startTime;
      this.processingTimes.push(processingTime);
      
      // Keep only last 1000 processing times for average calculation
      if (this.processingTimes.length > 1000) {
        this.processingTimes = this.processingTimes.slice(-1000);
      }
      
      this.updateMetrics(event, 'processed');
      this.updateHandlerMetrics(handler.metadata.handlerName);
      
      this.logger.debug(`Event processed successfully: ${event.eventType} by ${handler.metadata.handlerName}`);
    } catch (error) {
      this.updateMetrics(event, 'failed');
      this.logger.error(
        `Failed to process event: ${event.eventType} with handler: ${handler.metadata.handlerName}`,
        error.stack,
      );
      throw error;
    }
  }

  private updateMetrics(event: DomainEvent, action: 'published' | 'processed' | 'failed'): void {
    switch (action) {
      case 'published':
        this.metrics.totalEventsPublished++;
        break;
      case 'processed':
        this.metrics.totalEventsProcessed++;
        break;
      case 'failed':
        this.metrics.totalEventsFailed++;
        break;
    }

    this.metrics.eventsByType[event.eventType] = (this.metrics.eventsByType[event.eventType] || 0) + 1;
    this.metrics.lastEventTimestamp = new Date();
  }

  private updateHandlerMetrics(handlerName: string): void {
    this.metrics.handlersByType[handlerName] = (this.metrics.handlersByType[handlerName] || 0) + 1;
  }

  private calculateAverageProcessingTime(): number {
    if (this.processingTimes.length === 0) {
      return 0;
    }
    
    const sum = this.processingTimes.reduce((acc, time) => acc + time, 0);
    return sum / this.processingTimes.length;
  }
}
