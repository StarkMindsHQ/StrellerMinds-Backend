// Domain events for event-driven communication

export class UserRegisteredEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class CourseEnrolledEvent {
  constructor(
    public readonly userId: string,
    public readonly courseId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class CourseCompletedEvent {
  constructor(
    public readonly userId: string,
    public readonly courseId: string,
    public readonly completionDate: Date = new Date(),
  ) {}
}

export class PaymentProcessedEvent {
  constructor(
    public readonly userId: string,
    public readonly amount: number,
    public readonly paymentId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class AssignmentSubmittedEvent {
  constructor(
    public readonly userId: string,
    public readonly assignmentId: string,
    public readonly courseId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class AssignmentGradedEvent {
  constructor(
    public readonly userId: string,
    public readonly assignmentId: string,
    public readonly grade: number,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class AchievementUnlockedEvent {
  constructor(
    public readonly userId: string,
    public readonly achievementId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}
