import { IEvent } from '../../cqrs/interfaces/event.interface';

export class UserCreatedEvent implements IEvent {
  readonly data: {
    userId: string;
    email: string;
    username: string;
    role: string;
  };

  readonly type: string;
  readonly aggregateId: string;
  readonly version: number;
  readonly timestamp: Date;
  readonly userId?: string;
  readonly metadata?: Record<string, any>;

  constructor(
    data: UserCreatedEvent['data'],
    userId?: string,
    metadata?: Record<string, any>
  ) {
    this.data = data;
    this.type = 'UserCreated';
    this.aggregateId = data.userId;
    this.version = 1;
    this.timestamp = new Date();
    this.userId = userId;
    this.metadata = metadata;
  }
}
