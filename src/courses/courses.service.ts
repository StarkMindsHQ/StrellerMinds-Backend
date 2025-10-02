import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Course } from './entities/course.entity';
import { CreateCourseDto } from './dtos/create.course.dto';
import { UpdateCourseDto } from './dtos/update.course.dto';
import { BaseService, PaginationOptions, PaginatedResult } from '../common/services/base.service';
import { ICourseService } from '../common/interfaces/service.interface';
import { SharedUtilityService } from '../common/services/shared-utility.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class CourseService
  extends BaseService<Course>
  implements ICourseService<Course, CreateCourseDto, UpdateCourseDto>
{
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    private readonly sharedUtilityService: SharedUtilityService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super(courseRepository);
  }

  /**
   * Create a new course
   */
  public async create(createCourseDto: CreateCourseDto): Promise<Course> {
    try {
      // Validate course data
      this.validateCourseData(createCourseDto);

      // Sanitize input data
      const sanitizedData = {
        ...createCourseDto,
        title: this.sharedUtilityService.sanitizeInput(createCourseDto.title),
        description: createCourseDto.description
          ? this.sharedUtilityService.sanitizeInput(createCourseDto.description)
          : undefined,
        modules: Promise.resolve(createCourseDto.modules || []),
        tags: Promise.resolve(createCourseDto.tagIds?.map((id) => ({ id })) || []),
      };

      const course = await this.createEntity(sanitizedData);

      // Emit course created event for other services to handle
      this.eventEmitter.emit('course.created', {
        course,
        instructorId: createCourseDto.instructorId,
      });

      return course;
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      return this.handleError(error, 'creating course');
    }
  }

  /**
   * Find all courses with pagination
   */
  public async findAll(options?: PaginationOptions): Promise<PaginatedResult<Course>> {
    try {
      return await this.findEntitiesWithPagination({
        page: options?.page || 1,
        limit: options?.limit || 10,
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      return this.handleError(error, 'fetching courses');
    }
  }

  /**
   * Find course by ID with optimized relations
   */
  public async findOne(id: string, relations: string[] = []): Promise<Course> {
    try {
      // Use query builder to optimize relations and avoid N+1 queries
      const queryBuilder = this.courseRepository
        .createQueryBuilder('course')
        .leftJoinAndSelect('course.instructor', 'instructor')
        .leftJoinAndSelect('course.category', 'category')
        .where('course.id = :id', { id });

      // Add optional relations based on request
      if (relations.includes('modules')) {
        queryBuilder.leftJoinAndSelect('course.modules', 'modules');
      }

      if (relations.includes('tags')) {
        queryBuilder.leftJoinAndSelect('course.tags', 'tags');
      }

      if (relations.includes('reviews')) {
        queryBuilder
          .leftJoinAndSelect('course.reviews', 'reviews')
          .leftJoinAndSelect('reviews.user', 'reviewUser');
      }

      const course = await queryBuilder.getOne();

      if (!course) {
        throw new NotFoundException(`Course with ID ${id} not found`);
      }

      return course;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      return this.handleError(error, 'fetching course');
    }
  }

  /**
   * Find multiple courses with optimized relations to avoid N+1 queries
   */
  public async findCoursesWithRelations(
    options?: PaginationOptions,
    relations: string[] = [],
  ): Promise<PaginatedResult<Course>> {
    try {
      const page = options?.page || 1;
      const limit = options?.limit || 10;
      const skip = (page - 1) * limit;

      // Build query with all necessary relations to avoid N+1
      let queryBuilder = this.courseRepository
        .createQueryBuilder('course')
        .leftJoinAndSelect('course.instructor', 'instructor')
        .leftJoinAndSelect('course.category', 'category');

      // Add optional relations
      if (relations.includes('modules')) {
        queryBuilder = queryBuilder.leftJoinAndSelect('course.modules', 'modules');
      }

      if (relations.includes('tags')) {
        queryBuilder = queryBuilder.leftJoinAndSelect('course.tags', 'tags');
      }

      if (relations.includes('reviews')) {
        queryBuilder = queryBuilder
          .leftJoinAndSelect('course.reviews', 'reviews')
          .leftJoinAndSelect('reviews.user', 'reviewUser');
      }

      // Add ordering
      queryBuilder = queryBuilder.orderBy('course.createdAt', 'DESC');

      // Get results with pagination
      const [courses, total] = await queryBuilder.skip(skip).take(limit).getManyAndCount();

      return {
        items: courses,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      return this.handleError(error, 'fetching courses with relations');
    }
  }

  /**
   * Find courses by instructor with optimized query to avoid N+1
   */
  public async findByInstructor(
    instructorId: string,
    options?: PaginationOptions,
    relations: string[] = [],
  ): Promise<PaginatedResult<Course>> {
    try {
      const page = options?.page || 1;
      const limit = options?.limit || 10;
      const skip = (page - 1) * limit;

      // Build query with all necessary relations to avoid N+1
      let queryBuilder = this.courseRepository
        .createQueryBuilder('course')
        .leftJoinAndSelect('course.instructor', 'instructor')
        .leftJoinAndSelect('course.category', 'category')
        .where('instructor.id = :instructorId', { instructorId });

      // Add optional relations
      if (relations.includes('modules')) {
        queryBuilder = queryBuilder.leftJoinAndSelect('course.modules', 'modules');
      }

      if (relations.includes('tags')) {
        queryBuilder = queryBuilder.leftJoinAndSelect('course.tags', 'tags');
      }

      if (relations.includes('reviews')) {
        queryBuilder = queryBuilder
          .leftJoinAndSelect('course.reviews', 'reviews')
          .leftJoinAndSelect('reviews.user', 'reviewUser');
      }

      // Add ordering
      queryBuilder = queryBuilder.orderBy('course.createdAt', 'DESC');

      // Get results with pagination
      const [courses, total] = await queryBuilder.skip(skip).take(limit).getManyAndCount();

      return {
        data: courses,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      return this.handleError(error, 'fetching courses by instructor');
    }
  }

  /**
   * Find courses by category with optimized query to avoid N+1
   */
  public async findByCategory(
    categoryId: string,
    options?: PaginationOptions,
    relations: string[] = [],
  ): Promise<PaginatedResult<Course>> {
    try {
      const page = options?.page || 1;
      const limit = options?.limit || 10;
      const skip = (page - 1) * limit;

      // Build query with all necessary relations to avoid N+1
      let queryBuilder = this.courseRepository
        .createQueryBuilder('course')
        .leftJoinAndSelect('course.instructor', 'instructor')
        .leftJoinAndSelect('course.category', 'category')
        .where('category.id = :categoryId', { categoryId });

      // Add optional relations
      if (relations.includes('modules')) {
        queryBuilder = queryBuilder.leftJoinAndSelect('course.modules', 'modules');
      }

      if (relations.includes('tags')) {
        queryBuilder = queryBuilder.leftJoinAndSelect('course.tags', 'tags');
      }

      if (relations.includes('reviews')) {
        queryBuilder = queryBuilder
          .leftJoinAndSelect('course.reviews', 'reviews')
          .leftJoinAndSelect('reviews.user', 'reviewUser');
      }

      // Add ordering
      queryBuilder = queryBuilder.orderBy('course.createdAt', 'DESC');

      // Get results with pagination
      const [courses, total] = await queryBuilder.skip(skip).take(limit).getManyAndCount();

      return {
        data: courses,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      return this.handleError(error, 'fetching courses by category');
    }
  }

  /**
   * Get course statistics with a single optimized query
   */
  public async getCourseStatistics(courseId: string): Promise<any> {
    try {
      const result = await this.courseRepository
        .createQueryBuilder('course')
        .leftJoin('course.modules', 'modules')
        .leftJoin('course.lessons', 'lessons')
        .leftJoin('course.reviews', 'reviews')
        .leftJoin('course.userProgress', 'userProgress')
        .select([
          'course.id',
          'COUNT(DISTINCT modules.id) as moduleCount',
          'COUNT(DISTINCT lessons.id) as lessonCount',
          'COUNT(DISTINCT reviews.id) as reviewCount',
          'COUNT(DISTINCT userProgress.id) as enrollmentCount',
          'AVG(reviews.rating) as averageRating',
        ])
        .where('course.id = :courseId', { courseId })
        .groupBy('course.id')
        .getRawOne();

      return {
        moduleId: courseId,
        moduleCount: parseInt(result?.modulecount) || 0,
        lessonCount: parseInt(result?.lessoncount) || 0,
        reviewCount: parseInt(result?.reviewcount) || 0,
        enrollmentCount: parseInt(result?.enrollmentcount) || 0,
        averageRating: parseFloat(result?.averagerating) || 0,
      };
    } catch (error) {
      return this.handleError(error, 'getting course statistics');
    }
  }

  /**
   * Get popular courses with optimized query
   */
  public async getPopularCourses(limit: number = 10, relations: string[] = []): Promise<Course[]> {
    try {
      // Build query with all necessary relations to avoid N+1
      let queryBuilder = this.courseRepository
        .createQueryBuilder('course')
        .leftJoinAndSelect('course.instructor', 'instructor')
        .leftJoinAndSelect('course.category', 'category')
        .leftJoin('course.userProgress', 'userProgress')
        .select([
          'course',
          'instructor.id',
          'instructor.firstName',
          'instructor.lastName',
          'category.id',
          'category.name',
          'COUNT(userProgress.id) as enrollmentCount',
        ])
        .groupBy('course.id, instructor.id, category.id')
        .orderBy('enrollmentCount', 'DESC')
        .limit(limit);

      // Add optional relations
      if (relations.includes('modules')) {
        queryBuilder = queryBuilder.leftJoinAndSelect('course.modules', 'modules');
      }

      if (relations.includes('tags')) {
        queryBuilder = queryBuilder.leftJoinAndSelect('course.tags', 'tags');
      }

      const courses = await queryBuilder.getRawAndEntities();
      return courses.entities;
    } catch (error) {
      return this.handleError(error, 'fetching popular courses');
    }
  }

  /**
   * Update course by ID
   */
  public async update(id: string, updateCourseDto: UpdateCourseDto): Promise<Course> {
    try {
      // Validate update data
      this.validateCourseUpdateData(updateCourseDto);

      // Sanitize input data
      const sanitizedData = this.sharedUtilityService.removeEmptyValues({
        ...updateCourseDto,
        title: updateCourseDto.title
          ? this.sharedUtilityService.sanitizeInput(updateCourseDto.title)
          : undefined,
        description: updateCourseDto.description
          ? this.sharedUtilityService.sanitizeInput(updateCourseDto.description)
          : undefined,
        modules: updateCourseDto.modules ? Promise.resolve(updateCourseDto.modules) : undefined,
        tags: updateCourseDto.tagIds
          ? Promise.resolve(updateCourseDto.tagIds.map((id) => ({ id })))
          : undefined,
      });

      const updatedCourse = await this.updateEntity(id, sanitizedData);

      // Emit course updated event
      this.eventEmitter.emit('course.updated', { courseId: id, updates: updateCourseDto });

      return updatedCourse;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      return this.handleError(error, 'updating course');
    }
  }

  /**
   * Delete course by ID
   */
  public async delete(id: string): Promise<void> {
    try {
      await this.deleteEntity(id);

      // Emit course deleted event
      this.eventEmitter.emit('course.deleted', { courseId: id });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      return this.handleError(error, 'deleting course');
    }
  }

  /**
   * Enroll a user in a course
   */
  async enrollUser(courseId: string, userId: string): Promise<void> {
    try {
      const course = await this.findOne(courseId);

      // Check if user is already enrolled
      const isEnrolled = await this.isUserEnrolled(courseId, userId);
      if (isEnrolled) {
        throw new ConflictException('User is already enrolled in this course');
      }

      // Add enrollment logic here
      // This would typically involve creating an enrollment record

      // Emit enrollment event
      this.eventEmitter.emit('course.enrollment.created', { courseId, userId });
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      return this.handleError(error, 'enrolling user in course');
    }
  }

  /**
   * Unenroll a user from a course
   */
  async unenrollUser(courseId: string, userId: string): Promise<void> {
    try {
      const course = await this.findOne(courseId);

      // Check if user is enrolled
      const isEnrolled = await this.isUserEnrolled(courseId, userId);
      if (!isEnrolled) {
        throw new ConflictException('User is not enrolled in this course');
      }

      // Remove enrollment logic here

      // Emit unenrollment event
      this.eventEmitter.emit('course.enrollment.removed', { courseId, userId });
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      return this.handleError(error, 'unenrolling user from course');
    }
  }

  /**
   * Get enrolled users for a course with optimized query
   */
  async getEnrolledUsers(courseId: string): Promise<any[]> {
    try {
      // Use a single query to get all enrolled users with their profiles
      // This avoids N+1 queries when fetching user information
      const users = await this.courseRepository
        .createQueryBuilder('course')
        .leftJoinAndSelect('course.userProgress', 'userProgress')
        .leftJoinAndSelect('userProgress.user', 'user')
        .leftJoinAndSelect('user.profile', 'profile')
        .where('course.id = :courseId', { courseId })
        .select([
          'user.id',
          'user.firstName',
          'user.lastName',
          'user.email',
          'profile.avatar',
          'profile.bio',
        ])
        .getOne();

      if (!users) {
        return [];
      }

      // Return user information from progress relations
      return (
        users.userProgress?.map((progress) => ({
          id: progress.user.id,
          firstName: progress.user.firstName,
          lastName: progress.user.lastName,
          email: progress.user.email,
          avatar: progress.user.profile?.avatar,
          bio: progress.user.profile?.bio,
        })) || []
      );
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      return this.handleError(error, 'getting enrolled users');
    }
  }

  /**
   * Get course progress for a user
   */
  async getCourseProgress(courseId: string, userId: string): Promise<number> {
    try {
      await this.findOne(courseId);

      // This would typically calculate progress based on completed modules
      // For now, return 0
      return 0;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      return this.handleError(error, 'getting course progress');
    }
  }

  /**
   * Check if user is enrolled in course
   */
  private async isUserEnrolled(courseId: string, userId: string): Promise<boolean> {
    try {
      // This would typically query an enrollment table
      // For now, return false
      return false;
    } catch (error) {
      this.logger.error(
        `Error checking enrollment for course ${courseId} and user ${userId}: ${error.message}`,
      );
      return false;
    }
  }

  /**
   * Validate course creation data
   */
  private validateCourseData(createCourseDto: CreateCourseDto): void {
    if (!createCourseDto.title || createCourseDto.title.trim().length === 0) {
      throw new ConflictException('Course title is required');
    }

    if (createCourseDto.title.length > 255) {
      throw new ConflictException('Course title must be less than 255 characters');
    }

    if (createCourseDto.description && createCourseDto.description.length > 1000) {
      throw new ConflictException('Course description must be less than 1000 characters');
    }
  }

  /**
   * Validate course update data
   */
  private validateCourseUpdateData(updateCourseDto: UpdateCourseDto): void {
    if (updateCourseDto.title && updateCourseDto.title.trim().length === 0) {
      throw new ConflictException('Course title cannot be empty');
    }

    if (updateCourseDto.title && updateCourseDto.title.length > 255) {
      throw new ConflictException('Course title must be less than 255 characters');
    }

    if (updateCourseDto.description && updateCourseDto.description.length > 1000) {
      throw new ConflictException('Course description must be less than 1000 characters');
    }
  }
}
