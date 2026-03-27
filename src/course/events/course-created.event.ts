import { IEvent } from '../../cqrs/interfaces/event.interface';

export class CourseCreatedEvent implements IEvent {
  readonly data: {
    courseId: string;
    title: string;
    instructorId: string;
    category: string;
    level: string;
  };

  readonly type: string;
  readonly aggregateId: string;
  readonly version: number;
  readonly timestamp: Date;
  readonly userId?: string;
  readonly metadata?: Record<string, any>;

  constructor(
    data: CourseCreatedEvent['data'],
    userId?: string,
    metadata?: Record<string, any>
  ) {
    this.data = data;
    this.type = 'CourseCreated';
    this.aggregateId = data.courseId;
    this.version = 1;
    this.timestamp = new Date();
    this.userId = userId;
    this.metadata = metadata;
  }
}
