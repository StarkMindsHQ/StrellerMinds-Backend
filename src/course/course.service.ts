import { Injectable } from '@nestjs/common';
import { Course } from './entities/course.entity';
import { ShardedCourseRepository } from './repositories/sharded-course.repository';

@Injectable()
export class CourseService {
  constructor(
    private readonly shardedCourseRepository: ShardedCourseRepository,
  ) {}

  async findAll(search?: string): Promise<Course[]> {
    if (search) {
      return this.shardedCourseRepository.searchByTitle(search);
    }
    return this.shardedCourseRepository.findActiveCourses();
  }

  async findOne(id: string): Promise<Course | null> {
    return this.shardedCourseRepository.findById(id);
  }

  async create(courseData: Partial<Course>): Promise<Course> {
    return this.shardedCourseRepository.createCourse(courseData);
  }

  async update(id: string, updates: Partial<Course>): Promise<Course | null> {
    return this.shardedCourseRepository.updateCourseDetails(id, updates);
  }

  async delete(id: string): Promise<boolean> {
    return this.shardedCourseRepository.delete(id);
  }

  async findByInstructor(instructorId: string): Promise<Course[]> {
    return this.shardedCourseRepository.findByInstructor(instructorId);
  }

  async deactivateCourse(id: string): Promise<Course | null> {
    return this.shardedCourseRepository.deactivateCourse(id);
  }

  async activateCourse(id: string): Promise<Course | null> {
    return this.shardedCourseRepository.activateCourse(id);
  }

  async getCourseStats() {
    return this.shardedCourseRepository.getCourseStats();
  }

  async getPaginatedCourses(
    page: number = 1,
    limit: number = 10,
    filters: {
      isActive?: boolean;
      instructorId?: string;
      search?: string;
      startDate?: Date;
      endDate?: Date;
    } = {},
  ) {
    return this.shardedCourseRepository.getPaginatedCourses(page, limit, filters);
  }

  async getInstructorStats(instructorId: string) {
    return this.shardedCourseRepository.getInstructorStats(instructorId);
  }
}
