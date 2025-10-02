import { Injectable, Logger } from '@nestjs/common';
import { IEventStore, EventStoreQuery } from '../interfaces/event-store.interface';
import { EventBusService } from './event-bus.service';
import { Inject } from '@nestjs/common';

export interface ReplayOptions {
  fromPosition?: number;
  toPosition?: number;
  fromTimestamp?: Date;
  toTimestamp?: Date;
  eventTypes?: string[];
  aggregateIds?: string[];
  aggregateTypes?: string[];
  batchSize?: number;
  delayBetweenBatches?: number;
  dryRun?: boolean;
  skipEventTypes?: string[];
  onProgress?: (processed: number, total: number) => void;
  onError?: (error: Error, event: any) => void;
}

export interface ReplayResult {
  success: boolean;
  totalEvents: number;
  processedEvents: number;
  failedEvents: number;
  skippedEvents: number;
  startTime: Date;
  endTime: Date;
  duration: number;
  errors: Array<{
    event: any;
    error: string;
    timestamp: Date;
  }>;
}

@Injectable()
export class EventReplayService {
  private readonly logger = new Logger(EventReplayService.name);

  constructor(
    @Inject('EVENT_STORE') private readonly eventStore: IEventStore,
    private readonly eventBus: EventBusService,
  ) {}

  async replayEvents(options: ReplayOptions = {}): Promise<ReplayResult> {
    const startTime = new Date();
    const result: ReplayResult = {
      success: false,
      totalEvents: 0,
      processedEvents: 0,
      failedEvents: 0,
      skippedEvents: 0,
      startTime,
      endTime: new Date(),
      duration: 0,
      errors: [],
    };

    try {
      this.logger.log('Starting event replay', options);

      // Build query from options
      const query = this.buildQuery(options);

      // Get events to replay
      const events = await this.eventStore.queryEvents(query);
      result.totalEvents = events.length;

      if (events.length === 0) {
        this.logger.log('No events found for replay');
        result.success = true;
        result.endTime = new Date();
        result.duration = result.endTime.getTime() - startTime.getTime();
        return result;
      }

      this.logger.log(`Found ${events.length} events to replay`);

      // Process events in batches
      const batchSize = options.batchSize || 100;
      const delayBetweenBatches = options.delayBetweenBatches || 0;

      for (let i = 0; i < events.length; i += batchSize) {
        const batch = events.slice(i, i + batchSize);

        this.logger.debug(
          `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(events.length / batchSize)}`,
        );

        for (const eventRecord of batch) {
          try {
            // Check if event should be skipped
            if (this.shouldSkipEvent(eventRecord, options)) {
              result.skippedEvents++;
              continue;
            }

            // Reconstruct domain event
            const domainEvent = this.reconstructDomainEvent(eventRecord);

            if (!options.dryRun) {
              // Replay the event
              await this.eventBus.publish(domainEvent);
            }

            result.processedEvents++;

            // Report progress
            if (options.onProgress) {
              options.onProgress(result.processedEvents + result.skippedEvents, result.totalEvents);
            }
          } catch (error) {
            result.failedEvents++;
            const errorInfo = {
              event: eventRecord,
              error: error.message,
              timestamp: new Date(),
            };
            result.errors.push(errorInfo);

            this.logger.error(`Failed to replay event ${eventRecord.eventId}`, error.stack);

            if (options.onError) {
              options.onError(error, eventRecord);
            }
          }
        }

        // Delay between batches if specified
        if (delayBetweenBatches > 0 && i + batchSize < events.length) {
          await this.sleep(delayBetweenBatches);
        }
      }

      result.success = result.failedEvents === 0;
      result.endTime = new Date();
      result.duration = result.endTime.getTime() - startTime.getTime();

      this.logger.log('Event replay completed', {
        totalEvents: result.totalEvents,
        processedEvents: result.processedEvents,
        failedEvents: result.failedEvents,
        skippedEvents: result.skippedEvents,
        duration: result.duration,
        success: result.success,
      });

      return result;
    } catch (error) {
      result.success = false;
      result.endTime = new Date();
      result.duration = result.endTime.getTime() - startTime.getTime();

      this.logger.error('Event replay failed', error.stack);
      throw error;
    }
  }

  async replayAggregateEvents(
    aggregateId: string,
    aggregateType: string,
    fromVersion?: number,
    options: Omit<ReplayOptions, 'aggregateIds' | 'aggregateTypes'> = {},
  ): Promise<ReplayResult> {
    return this.replayEvents({
      ...options,
      aggregateIds: [aggregateId],
      aggregateTypes: [aggregateType],
      fromPosition: fromVersion,
    });
  }

  async replayEventsByTimeRange(
    fromTimestamp: Date,
    toTimestamp: Date,
    options: Omit<ReplayOptions, 'fromTimestamp' | 'toTimestamp'> = {},
  ): Promise<ReplayResult> {
    return this.replayEvents({
      ...options,
      fromTimestamp,
      toTimestamp,
    });
  }

  async replayEventsByType(
    eventTypes: string[],
    options: Omit<ReplayOptions, 'eventTypes'> = {},
  ): Promise<ReplayResult> {
    return this.replayEvents({
      ...options,
      eventTypes,
    });
  }

  async getReplayPreview(options: ReplayOptions = {}): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    dateRange: { from: Date; to: Date } | null;
    aggregates: Array<{ aggregateType: string; aggregateId: string; eventCount: number }>;
  }> {
    const query = this.buildQuery(options);
    const events = await this.eventStore.queryEvents(query);

    const eventsByType: Record<string, number> = {};
    const aggregates = new Map<string, number>();
    let minDate: Date | null = null;
    let maxDate: Date | null = null;

    for (const event of events) {
      // Count by type
      eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1;

      // Count by aggregate
      const aggregateKey = `${event.aggregateType}:${event.aggregateId}`;
      aggregates.set(aggregateKey, (aggregates.get(aggregateKey) || 0) + 1);

      // Track date range
      if (!minDate || event.timestamp < minDate) {
        minDate = event.timestamp;
      }
      if (!maxDate || event.timestamp > maxDate) {
        maxDate = event.timestamp;
      }
    }

    return {
      totalEvents: events.length,
      eventsByType,
      dateRange: minDate && maxDate ? { from: minDate, to: maxDate } : null,
      aggregates: Array.from(aggregates.entries()).map(([key, count]) => {
        const [aggregateType, aggregateId] = key.split(':');
        return { aggregateType, aggregateId, eventCount: count };
      }),
    };
  }

  private buildQuery(options: ReplayOptions): EventStoreQuery {
    const query: EventStoreQuery = {};

    if (options.fromPosition !== undefined) {
      query.fromVersion = options.fromPosition;
    }

    if (options.toPosition !== undefined) {
      query.toVersion = options.toPosition;
    }

    if (options.fromTimestamp) {
      query.fromTimestamp = options.fromTimestamp;
    }

    if (options.toTimestamp) {
      query.toTimestamp = options.toTimestamp;
    }

    if (options.eventTypes && options.eventTypes.length > 0) {
      query.eventTypes = options.eventTypes;
    }

    if (options.aggregateIds && options.aggregateIds.length === 1) {
      query.aggregateId = options.aggregateIds[0];
    }

    if (options.aggregateTypes && options.aggregateTypes.length === 1) {
      query.aggregateType = options.aggregateTypes[0];
    }

    return query;
  }

  private shouldSkipEvent(eventRecord: any, options: ReplayOptions): boolean {
    if (options.skipEventTypes && options.skipEventTypes.includes(eventRecord.eventType)) {
      return true;
    }

    if (options.aggregateIds && !options.aggregateIds.includes(eventRecord.aggregateId)) {
      return true;
    }

    if (options.aggregateTypes && !options.aggregateTypes.includes(eventRecord.aggregateType)) {
      return true;
    }

    return false;
  }

  private reconstructDomainEvent(eventRecord: any): any {
    // This is a simplified reconstruction
    // In a real implementation, you would use a registry of event classes
    return {
      eventId: eventRecord.eventId,
      eventType: eventRecord.eventType,
      aggregateId: eventRecord.aggregateId,
      aggregateType: eventRecord.aggregateType,
      eventVersion: eventRecord.eventVersion,
      timestamp: eventRecord.timestamp,
      metadata: eventRecord.metadata,
      getPayload: () => eventRecord.eventData,
      toJSON: () => ({
        eventId: eventRecord.eventId,
        eventType: eventRecord.eventType,
        aggregateId: eventRecord.aggregateId,
        aggregateType: eventRecord.aggregateType,
        eventVersion: eventRecord.eventVersion,
        timestamp: eventRecord.timestamp,
        metadata: eventRecord.metadata,
        payload: eventRecord.eventData,
      }),
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
