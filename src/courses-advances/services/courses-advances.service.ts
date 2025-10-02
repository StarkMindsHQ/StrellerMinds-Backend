import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CoursesAdvance } from '../entities/courses-advance.entity';
import { CreateCoursesAdvanceDto } from '../dto/create-courses-advance.dto';
import { UpdateCoursesAdvanceDto } from '../dto/update-courses-advance.dto';

@Injectable()
export class CoursesAdvancesService {
  constructor(
    @InjectRepository(CoursesAdvance)
    private courseRepository: Repository<CoursesAdvance>,
  ) {}

  async create(
    createCourseDto: CreateCoursesAdvanceDto,
    instructorId: string,
  ): Promise<CoursesAdvance> {
    const course = this.courseRepository.create({
      ...createCourseDto,
      instructorId,
    });
    return this.courseRepository.save(course);
  }

  async findAll(instructorId?: string): Promise<CoursesAdvance[]> {
    const queryBuilder = this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.instructor', 'instructor')
      .leftJoinAndSelect('course.versions', 'versions')
      .orderBy('course.createdAt', 'DESC');

    if (instructorId) {
      queryBuilder.where('course.instructorId = :instructorId', {
        instructorId,
      });
    }

    return queryBuilder.getMany();
  }

  async findOne(id: string): Promise<CoursesAdvance> {
    const course = await this.courseRepository.findOne({
      where: { id },
      relations: ['instructor', 'versions', 'analytics'],
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return course;
  }

  async update(
    id: string,
    updateCourseDto: UpdateCoursesAdvanceDto,
    userId: string,
  ): Promise<CoursesAdvance> {
    const course = await this.findOne(id);

    if (course.instructorId !== userId) {
      throw new ForbiddenException('You can only update your own courses');
    }

    Object.assign(course, updateCourseDto);
    return this.courseRepository.save(course);
  }

  async remove(id: string, userId: string): Promise<void> {
    const course = await this.findOne(id);

    if (course.instructorId !== userId) {
      throw new ForbiddenException('You can only delete your own courses');
    }

    await this.courseRepository.remove(course);
  }

  async getCoursesByCategory(category: string): Promise<CoursesAdvance[]> {
    return this.courseRepository.find({
      where: { category, status: 'published' },
      relations: ['instructor'],
    });
  }

  async getPopularCourses(limit: number = 10): Promise<CoursesAdvance[]> {
    return this.courseRepository.find({
      where: { status: 'published' },
      order: { enrollmentCount: 'DESC', averageRating: 'DESC' },
      take: limit,
      relations: ['instructor'],
    });
  }

  async searchCourses(query: string): Promise<CoursesAdvance[]> {
    return this.courseRepository
      .createQueryBuilder('course')
      .where('course.title ILIKE :query OR course.description ILIKE :query', {
        query: `%${query}%`,
      })
      .andWhere('course.status = :status', { status: 'published' })
      .leftJoinAndSelect('course.instructor', 'instructor')
      .getMany();
  }
}
