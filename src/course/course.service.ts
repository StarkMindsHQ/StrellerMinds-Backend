import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from './entities/course.entity';
import { QueryCacheService } from '../common/cache/query-cache.service';

@Injectable()
export class CourseService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    private readonly queryCache: QueryCacheService,
  ) {}

  async findAll(category?: string, difficulty?: string): Promise<Course[]> {
    const key = `courses:all:${category ?? ''}:${difficulty ?? ''}`;
    return this.queryCache.getOrSet(key, async () => {
      const where: Record<string, string> = {};
      if (category) where.category = category;
      if (difficulty) where.difficulty = difficulty;
      return this.courseRepository.find({ where });
    });
  }

  async findOne(id: string): Promise<Course | null> {
    const key = `courses:one:${id}`;
    return this.queryCache.getOrSet(key, () =>
      this.courseRepository.findOne({ where: { id } }),
    );
  }
}
