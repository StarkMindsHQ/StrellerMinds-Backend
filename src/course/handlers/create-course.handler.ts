import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommandHandler } from '../../cqrs/decorators/command-handler.decorator';
import { ICommandHandler } from '../../cqrs/interfaces/command.interface';
import { CreateCourseCommand } from '../commands/create-course.command';
import { Course } from '../entities/course.entity';
import { EventBus } from '../../cqrs/bus/event-bus.service';
import { CourseCreatedEvent } from '../events/course-created.event';

@Injectable()
@CommandHandler(CreateCourseCommand)
export class CreateCourseHandler implements ICommandHandler<CreateCourseCommand> {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    private readonly eventBus: EventBus,
  ) {}

  async handle(command: CreateCourseCommand): Promise<Course> {
    const { title, description, instructorId, category, level, duration, price, tags } = command.data;

    const course = this.courseRepository.create({
      title,
      description,
      instructorId,
      category,
      level,
      duration,
      price,
      tags,
      status: 'DRAFT',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const savedCourse = await this.courseRepository.save(course);

    const event = new CourseCreatedEvent(
      {
        courseId: savedCourse.id,
        title: savedCourse.title,
        instructorId: savedCourse.instructorId,
        category: savedCourse.category,
        level: savedCourse.level,
      },
      command.userId
    );

    await this.eventBus.publish(event);

    return savedCourse;
  }
}
