import { Injectable } from '@nestjs/common';
import { BaseShardedRepository } from '../../database/sharding/base-sharded.repository';
import { ShardingService } from '../../database/sharding/sharding.service';
import { Course } from '../entities/course.entity';
import { FindOptionsWhere } from 'typeorm';

@Injectable()
export class ShardedCourseRepository extends BaseShardedRepository<Course> {
  constructor(shardingService: ShardingService) {
    super(shardingService, Course);
  }

  /**
   * Finds courses by instructor ID (sharded by instructor)
   */
  async findByInstructor(instructorId: string): Promise<Course[]> {
    return this.findOnShard(instructorId, {
      where: { instructorId } as FindOptionsWhere<Course>,
    });
  }

  /**
   * Finds active courses across all shards
   */
  async findActiveCourses(limit?: number): Promise<Course[]> {
    return this.shardingService.executeAcrossAllShards(
      async (repository) => {
        const findOptions: any = { 
          where: { isActive: true },
          order: { createdAt: 'DESC' }
        };
        if (limit) {
          findOptions.take = limit;
        }
        return repository.find(findOptions);
      },
      Course,
    );
  }

  /**
   * Searches courses by title across all shards
   */
  async searchByTitle(query: string): Promise<Course[]> {
    return this.shardingService.executeAcrossAllShards(
      async (repository) => {
        return repository
          .createQueryBuilder('course')
          .where('course.title ILIKE :query', { query: `%${query}%` })
          .orWhere('course.description ILIKE :query', { query: `%${query}%` })
          .andWhere('course.isActive = :isActive', { isActive: true })
          .orderBy('course.createdAt', 'DESC')
          .getMany();
      },
      Course,
    );
  }

  /**
   * Finds courses created within a date range across all shards
   */
  async findByDateRange(startDate: Date, endDate: Date): Promise<Course[]> {
    return this.shardingService.executeAcrossAllShards(
      async (repository) => {
        return repository.find({
          where: {
            createdAt: {
              $gte: startDate,
              $lte: endDate,
            },
          } as any,
          order: { createdAt: 'DESC' },
        });
      },
      Course,
    );
  }

  /**
   * Deactivates a course
   */
  async deactivateCourse(courseId: string): Promise<Course | null> {
    return this.update(courseId, { isActive: false } as any);
  }

  /**
   * Activates a course
   */
  async activateCourse(courseId: string): Promise<Course | null> {
    return this.update(courseId, { isActive: true } as any);
  }

  /**
   * Updates course details
   */
  async updateCourseDetails(
    courseId: string,
    updates: {
      title?: string;
      description?: string;
      instructorId?: string;
      isActive?: boolean;
    },
  ): Promise<Course | null> {
    return this.update(courseId, updates as any);
  }

  /**
   * Gets course statistics across all shards
   */
  async getCourseStats(): Promise<{
    totalCourses: number;
    activeCourses: number;
    inactiveCourses: number;
    coursesCreatedToday: number;
    coursesCreatedThisMonth: number;
  }> {
    const stats = await this.shardingService.executeAcrossAllShards(
      async (repository) => {
        const totalCourses = await repository.count();
        const activeCourses = await repository.count({
          where: { isActive: true } as FindOptionsWhere<Course>,
        });
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const coursesCreatedToday = await repository.count({
          where: {
            createdAt: {
              $gte: today,
            },
          } as any,
        });

        const thisMonth = new Date();
        thisMonth.setDate(1);
        thisMonth.setHours(0, 0, 0, 0);
        const coursesCreatedThisMonth = await repository.count({
          where: {
            createdAt: {
              $gte: thisMonth,
            },
          } as any,
        });

        return {
          totalCourses,
          activeCourses,
          inactiveCourses: totalCourses - activeCourses,
          coursesCreatedToday,
          coursesCreatedThisMonth,
        };
      },
      Course,
    );

    // Aggregate stats across all shards
    return stats.reduce(
      (acc, stat) => ({
        totalCourses: acc.totalCourses + stat.totalCourses,
        activeCourses: acc.activeCourses + stat.activeCourses,
        inactiveCourses: acc.inactiveCourses + stat.inactiveCourses,
        coursesCreatedToday: acc.coursesCreatedToday + stat.coursesCreatedToday,
        coursesCreatedThisMonth: acc.coursesCreatedThisMonth + stat.coursesCreatedThisMonth,
      }),
      {
        totalCourses: 0,
        activeCourses: 0,
        inactiveCourses: 0,
        coursesCreatedToday: 0,
        coursesCreatedThisMonth: 0,
      },
    );
  }

  /**
   * Creates a course with automatic shard key assignment
   */
  async createCourse(courseData: Partial<Course>): Promise<Course> {
    const course = new Course();
    Object.assign(course, courseData);
    
    // Set shard key to instructor ID or course ID
    course.setShardKey();
    
    return this.create(courseData);
  }

  /**
   * Gets paginated courses with filtering
   */
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
    const skip = (page - 1) * limit;
    
    const [items, total] = await Promise.all([
      this.shardingService.executeAcrossAllShards(
        async (repository) => {
          let query = repository.createQueryBuilder('course');
          
          if (filters.isActive !== undefined) {
            query = query.andWhere('course.isActive = :isActive', { 
              isActive: filters.isActive 
            });
          }
          
          if (filters.instructorId) {
            query = query.andWhere('course.instructorId = :instructorId', { 
              instructorId: filters.instructorId 
            });
          }
          
          if (filters.search) {
            query = query.andWhere(
              '(course.title ILIKE :search OR course.description ILIKE :search)',
              { search: `%${filters.search}%` }
            );
          }
          
          if (filters.startDate) {
            query = query.andWhere('course.createdAt >= :startDate', { 
              startDate: filters.startDate 
            });
          }
          
          if (filters.endDate) {
            query = query.andWhere('course.createdAt <= :endDate', { 
              endDate: filters.endDate 
            });
          }
          
          return query
            .orderBy('course.createdAt', 'DESC')
            .skip(skip)
            .take(limit)
            .getMany();
        },
        Course,
      ),
      this.count(),
    ]);

    const flattenedItems = items.flat().slice(0, limit);
    const totalPages = Math.ceil(total / limit);

    return {
      items: flattenedItems,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Gets courses by multiple instructor IDs efficiently
   */
  async findByMultipleInstructors(instructorIds: string[]): Promise<Course[]> {
    const promises = instructorIds.map(instructorId =>
      this.findByInstructor(instructorId)
    );
    
    const results = await Promise.all(promises);
    return results.flat();
  }

  /**
   * Gets instructor course statistics
   */
  async getInstructorStats(instructorId: string): Promise<{
    totalCourses: number;
    activeCourses: number;
    inactiveCourses: number;
    coursesCreatedThisMonth: number;
  }> {
    const courses = await this.findByInstructor(instructorId);
    
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    
    const activeCourses = courses.filter(course => course.isActive).length;
    const coursesCreatedThisMonth = courses.filter(
      course => course.createdAt >= thisMonth
    ).length;
    
    return {
      totalCourses: courses.length,
      activeCourses,
      inactiveCourses: courses.length - activeCourses,
      coursesCreatedThisMonth,
    };
  }
}
