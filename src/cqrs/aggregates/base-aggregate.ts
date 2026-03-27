import { IEvent } from '../interfaces/event.interface';

export abstract class BaseAggregate {
  public readonly id: string;
  public version: number = 0;
  private uncommittedEvents: IEvent[] = [];

  constructor(id: string) {
    this.id = id;
  }

  protected apply(event: IEvent): void {
    this.when(event);
    this.version++;
  }

  public applyEvent(event: IEvent): void {
    this.apply(event);
    this.uncommittedEvents.push(event);
  }

  public getUncommittedEvents(): IEvent[] {
    return [...this.uncommittedEvents];
  }

  public clearUncommittedEvents(): void {
    this.uncommittedEvents = [];
  }

  public static fromHistory<T extends BaseAggregate>(
    this: new (id: string) => T,
    events: IEvent[]
  ): T {
    const aggregate = new this(events[0]?.aggregateId || '');
    events.forEach(event => aggregate.apply(event));
    return aggregate;
  }

  protected abstract when(event: IEvent): void;
}
