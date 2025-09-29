import { DomainEvent } from '../base/domain-event.base';

export interface EventStoreRecord {
  eventId: string;
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  eventVersion: number;
  eventData: any;
  metadata: any;
  timestamp: Date;
  position?: number;
}

export interface EventStream {
  aggregateId: string;
  aggregateType: string;
  events: EventStoreRecord[];
  version: number;
}

export interface EventStoreQuery {
  aggregateId?: string;
  aggregateType?: string;
  eventTypes?: string[];
  fromVersion?: number;
  toVersion?: number;
  fromTimestamp?: Date;
  toTimestamp?: Date;
  limit?: number;
  offset?: number;
}

export interface EventStoreOptions {
  expectedVersion?: number;
  correlationId?: string;
  causationId?: string;
}

export interface IEventStore {
  /**
   * Append events to the event store
   */
  appendEvents(
    aggregateId: string,
    aggregateType: string,
    events: DomainEvent[],
    options?: EventStoreOptions,
  ): Promise<void>;

  /**
   * Get events for a specific aggregate
   */
  getEvents(
    aggregateId: string,
    aggregateType: string,
    fromVersion?: number,
  ): Promise<EventStoreRecord[]>;

  /**
   * Get event stream for an aggregate
   */
  getEventStream(
    aggregateId: string,
    aggregateType: string,
  ): Promise<EventStream>;

  /**
   * Query events based on criteria
   */
  queryEvents(query: EventStoreQuery): Promise<EventStoreRecord[]>;

  /**
   * Get all events from a specific position
   */
  getAllEvents(fromPosition?: number, limit?: number): Promise<EventStoreRecord[]>;

  /**
   * Get the current version of an aggregate
   */
  getAggregateVersion(aggregateId: string, aggregateType: string): Promise<number>;

  /**
   * Check if an aggregate exists
   */
  aggregateExists(aggregateId: string, aggregateType: string): Promise<boolean>;

  /**
   * Create a snapshot of an aggregate
   */
  createSnapshot(
    aggregateId: string,
    aggregateType: string,
    version: number,
    data: any,
  ): Promise<void>;

  /**
   * Get the latest snapshot for an aggregate
   */
  getSnapshot(
    aggregateId: string,
    aggregateType: string,
  ): Promise<{ version: number; data: any } | null>;
}
