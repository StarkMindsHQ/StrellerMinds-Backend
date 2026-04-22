import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from './entities/course.entity';

@Injectable()
export class CourseService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) {}

  async findAll(): Promise<Course[]> {
    return this.courseRepository.find();
  }

  async findOne(id: string): Promise<Course | null> {
    return this.courseRepository.findOne({ where: { id } });
  }
}
