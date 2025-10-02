import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from './course.entity';

/**
 * CourseService provides logic for creating and retrieving courses.
 */
@Injectable()
export class CourseService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) {}

  /**
   * Create a new course.
   */
  async create(dto: Partial<Course>): Promise<Course> {
    const course = this.courseRepository.create(dto);
    return this.courseRepository.save(course);
  }

  /**
   * Get all courses.
   */
  async findAll(): Promise<Course[]> {
    return this.courseRepository.find();
  }

  /**
   * Get all courses (dummy endpoint).
   */
  getAllCourses() {
    return [];
  }
}
