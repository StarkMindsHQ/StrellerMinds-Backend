import { ICommand } from '../../cqrs/interfaces/command.interface';

export class CreateCourseCommand implements ICommand {
  readonly data: {
    title: string;
    description: string;
    instructorId: string;
    category: string;
    level: string;
    duration?: number;
    price?: number;
    tags?: string[];
  };

  readonly timestamp: Date;
  readonly id: string;
  readonly userId?: string;

  constructor(data: CreateCourseCommand['data'], userId?: string) {
    this.data = data;
    this.timestamp = new Date();
    this.id = `create-course-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.userId = userId;
  }
}
