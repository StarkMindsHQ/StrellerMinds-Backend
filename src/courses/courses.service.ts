import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from './entities/course.entity';
import { CreateCourseDto } from './dtos/create.course.dto';
import { UpdateCourseDto } from './dtos/update.course.dto';
import { BaseService, PaginationOptions, PaginatedResult } from '../common/services/base.service';
import { ICourseService } from '../common/interfaces/service.interface';
import { SharedUtilityService } from '../common/services/shared-utility.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class CourseService extends BaseService<Course> implements ICourseService<Course, CreateCourseDto, UpdateCourseDto> {
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
        description: createCourseDto.description ? this.sharedUtilityService.sanitizeInput(createCourseDto.description) : undefined,
        modules: Promise.resolve(createCourseDto.modules || []),
        tags: Promise.resolve(
          createCourseDto.tagIds?.map((id) => ({ id })) || [],
        ),
      };

      const course = await this.createEntity(sanitizedData);

      // Emit course created event for other services to handle
      this.eventEmitter.emit('course.created', { course, instructorId: createCourseDto.instructorId });

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
   * Find course by ID
   */
  public async findOne(id: string, relations: string[] = []): Promise<Course> {
    try {
      return await this.findEntityById(id, relations);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      return this.handleError(error, 'fetching course');
    }
  }

  /**
   * Update course by ID
   */
  public async update(
    id: string,
    updateCourseDto: UpdateCourseDto,
  ): Promise<Course> {
    try {
      // Validate update data
      this.validateCourseUpdateData(updateCourseDto);

      // Sanitize input data
      const sanitizedData = this.sharedUtilityService.removeEmptyValues({
        ...updateCourseDto,
        title: updateCourseDto.title ? this.sharedUtilityService.sanitizeInput(updateCourseDto.title) : undefined,
        description: updateCourseDto.description ? this.sharedUtilityService.sanitizeInput(updateCourseDto.description) : undefined,
        modules: updateCourseDto.modules
          ? Promise.resolve(updateCourseDto.modules)
          : undefined,
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
   * Get enrolled users for a course
   */
  async getEnrolledUsers(courseId: string): Promise<any[]> {
    try {
      await this.findOne(courseId);
      
      // This would typically query an enrollment table
      // For now, return empty array
      return [];
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
      this.logger.error(`Error checking enrollment for course ${courseId} and user ${userId}: ${error.message}`);
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
