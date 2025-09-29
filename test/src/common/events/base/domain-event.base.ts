import { v4 as uuidv4 } from 'uuid';

export interface DomainEventMetadata {
  correlationId?: string;
  causationId?: string;
  userId?: string;
  aggregateId: string;
  aggregateType: string;
  eventVersion: number;
  timestamp: Date;
  [key: string]: any;
}

export abstract class DomainEvent {
  public readonly eventId: string;
  public readonly eventType: string;
  public readonly aggregateId: string;
  public readonly aggregateType: string;
  public readonly eventVersion: number;
  public readonly timestamp: Date;
  public readonly metadata: DomainEventMetadata;

  constructor(
    aggregateId: string,
    aggregateType: string,
    eventVersion: number = 1,
    metadata: Partial<DomainEventMetadata> = {},
  ) {
    this.eventId = uuidv4();
    this.eventType = this.constructor.name;
    this.aggregateId = aggregateId;
    this.aggregateType = aggregateType;
    this.eventVersion = eventVersion;
    this.timestamp = new Date();
    this.metadata = {
      ...metadata,
      aggregateId,
      aggregateType,
      eventVersion,
      timestamp: this.timestamp,
    };
  }

  abstract getPayload(): any;

  toJSON(): any {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      aggregateId: this.aggregateId,
      aggregateType: this.aggregateType,
      eventVersion: this.eventVersion,
      timestamp: this.timestamp,
      metadata: this.metadata,
      payload: this.getPayload(),
    };
  }

  static fromJSON(data: any): DomainEvent {
    // This would be implemented by specific event classes
    throw new Error('fromJSON must be implemented by concrete event classes');
  }
}
