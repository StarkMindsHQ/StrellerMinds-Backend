import { DomainEvent } from './domain-event.base';

export class UserRegisteredEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly email: string,
    public readonly username: string,
    public readonly roles: string[]
  ) {
    super(aggregateId);
  }

  getEventName(): string {
    return 'UserRegistered';
  }
}

export class UserPasswordChangedEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly changedAt: Date
  ) {
    super(aggregateId);
  }

  getEventName(): string {
    return 'UserPasswordChanged';
  }
}

export class UserAccountLockedEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly lockedUntil: Date,
    public readonly reason: string
  ) {
    super(aggregateId);
  }

  getEventName(): string {
    return 'UserAccountLocked';
  }
}

export class UserAccountUnlockedEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly unlockedAt: Date
  ) {
    super(aggregateId);
  }

  getEventName(): string {
    return 'UserAccountUnlocked';
  }
}
