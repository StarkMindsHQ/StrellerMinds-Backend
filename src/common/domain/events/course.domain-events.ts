import { DomainEvent } from './domain-event.base';

export class CourseCreatedEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly title: string,
    public readonly instructorId: string,
    public readonly price: number,
    public readonly currency: string
  ) {
    super(aggregateId);
  }

  getEventName(): string {
    return 'CourseCreated';
  }
}

export class CoursePublishedEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly publishedAt: Date
  ) {
    super(aggregateId);
  }

  getEventName(): string {
    return 'CoursePublished';
  }
}

export class EnrollmentCreatedEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly studentId: string,
    public readonly courseId: string,
    public readonly enrolledAt: Date
  ) {
    super(aggregateId);
  }

  getEventName(): string {
    return 'EnrollmentCreated';
  }
}

export class EnrollmentCompletedEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly studentId: string,
    public readonly courseId: string,
    public readonly completedAt: Date,
    public readonly finalProgress: number
  ) {
    super(aggregateId);
  }

  getEventName(): string {
    return 'EnrollmentCompleted';
  }
}
