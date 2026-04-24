import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from './entities/course.entity';
import { PaginatedResponse } from '../common/dto/pagination.dto';

@Injectable()
export class CourseService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) {}

  async findAll(
    category?: string,
    difficulty?: string,
    cursor?: string,
    limit: number = 20,
  ): Promise<PaginatedResponse<Course>> {
    const queryBuilder = this.courseRepository.createQueryBuilder('course');

    // Apply filters
    const where: any = {};
    if (category) {
      where.category = category;
    }
    if (difficulty) {
      where.difficulty = difficulty;
    }

    // Apply cursor-based pagination
    if (cursor) {
      // Cursor is the ID of the last item from the previous page
      queryBuilder.andWhere('course.id > :cursor', { cursor });
    }

    // Always order by ID for consistent cursor pagination
    queryBuilder.orderBy('course.id', 'ASC');
    
    // Fetch limit + 1 to determine if there are more results
    const fetchLimit = limit + 1;
    queryBuilder.take(fetchLimit);
    queryBuilder.setParameters(where);
    queryBuilder.where(where);

    const courses = await queryBuilder.getMany();

    // Check if there are more results
    const hasMore = courses.length > limit;
    if (hasMore) {
      courses.pop(); // Remove the extra item
    }

    // Generate next cursor
    const nextCursor = hasMore && courses.length > 0 
      ? courses[courses.length - 1].id 
      : null;

    return {
      data: courses,
      nextCursor,
      hasMore,
    };
  }

  async findOne(id: string): Promise<Course | null> {
    return this.courseRepository.findOne({ where: { id } });
  }
}
