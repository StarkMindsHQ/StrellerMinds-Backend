export interface IEvent<T = any> {
  readonly data: T;
  readonly type: string;
  readonly aggregateId: string;
  readonly version: number;
  readonly timestamp: Date;
  readonly userId?: string;
  readonly metadata?: Record<string, any>;
}

export interface IEventHandler<TEvent extends IEvent> {
  handle(event: TEvent): Promise<void>;
}

export interface IEventStore {
  saveEvent(event: IEvent): Promise<void>;
  getEvents(aggregateId: string, fromVersion?: number): Promise<IEvent[]>;
  getEventsByType(eventType: string, fromTimestamp?: Date): Promise<IEvent[]>;
}
