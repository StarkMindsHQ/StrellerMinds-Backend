/**
 * Base class for all domain events (issue #840 - DDD).
 * Domain events represent something meaningful that happened in the domain.
 */
export abstract class DomainEvent {
  readonly occurredAt: Date;
  readonly eventId: string;

  constructor() {
    this.occurredAt = new Date();
    this.eventId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  abstract getEventName(): string;
}

/** Raised when a new user registers */
export class UserRegisteredEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
  ) {
    super();
  }

  getEventName(): string {
    return 'user.registered';
  }
}

/** Raised when a user's profile is updated */
export class UserUpdatedEvent extends DomainEvent {
  constructor(public readonly userId: string) {
    super();
  }

  getEventName(): string {
    return 'user.updated';
  }
}
