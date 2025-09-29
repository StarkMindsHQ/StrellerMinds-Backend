import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CoursesAdvance } from '../entities/courses-advance.entity';

@Injectable()
export class CoursesAdvancesService {
  constructor(
    @InjectRepository(CoursesAdvance)
    private readonly coursesAdvanceRepo: Repository<CoursesAdvance>,
  ) {}

  async create(dto: any, instructorId: string) {
    const course = this.coursesAdvanceRepo.create({ ...dto, instructorId });
    return await this.coursesAdvanceRepo.save(course);
  }

  async findOne(id: string) {
    const course = await this.coursesAdvanceRepo.findOne({ where: { id } });
    if (!course) {
      throw new NotFoundException(`Course with id ${id} not found`);
    }
    return course;
  }

  async update(id: string, dto: any, userId: string) {
    const course = await this.findOne(id);
    if (course.instructorId !== userId) {
      throw new ForbiddenException('You are not allowed to update this course');
    }
    Object.assign(course, dto);
    return await this.coursesAdvanceRepo.save(course);
  }

  async remove(id: string, userId: string) {
    const course = await this.findOne(id);
    if (course.instructorId !== userId) {
      throw new ForbiddenException('You are not allowed to remove this course');
    }
    return await this.coursesAdvanceRepo.remove(course);
  }
}
