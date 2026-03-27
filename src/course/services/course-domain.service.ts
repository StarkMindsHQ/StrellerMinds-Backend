import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from '../entities/course-rich.entity';
import { Enrollment } from './enrollment-rich.entity';
import { User } from '../../user/entities/user-rich.entity';

@Injectable()
export class CourseDomainService {
  constructor(
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,
  ) {}

  async canCourseBePublished(courseId: string): Promise<{
    canPublish: boolean;
    reasons: string[];
  }> {
    const course = await this.courseRepository.findOne({ 
      where: { id: courseId },
      relations: ['modules']
    });

    if (!course) {
      return { canPublish: false, reasons: ['Course not found'] };
    }

    const reasons: string[] = [];

    if (course.isPublished()) {
      reasons.push('Course is already published');
    }

    if (course.isArchived()) {
      reasons.push('Archived courses cannot be published');
    }

    if (!course.title || course.title.trim().length === 0) {
      reasons.push('Course must have a title');
    }

    if (!course.description || course.description.trim().length === 0) {
      reasons.push('Course must have a description');
    }

    if (!course.level) {
      reasons.push('Course must have a level specified');
    }

    if (!course.language) {
      reasons.push('Course must have a language specified');
    }

    if (course.durationMinutes <= 0) {
      reasons.push('Course must have duration greater than 0');
    }

    if (!course.modules || course.modules.length === 0) {
      reasons.push('Course must have at least one module');
    }

    // Check if modules have content
    if (course.modules) {
      const emptyModules = course.modules.filter(module => 
        !module.lessons || module.lessons.length === 0
      );

      if (emptyModules.length > 0) {
        reasons.push('All modules must have at least one lesson');
      }
    }

    return {
      canPublish: reasons.length === 0,
      reasons,
    };
  }

  async getCourseAnalytics(courseId: string): Promise<{
    totalEnrollments: number;
    activeEnrollments: number;
    completedEnrollments: number;
    droppedEnrollments: number;
    averageProgress: number;
    completionRate: number;
    averageCompletionTime: number;
    revenue: number;
  }> {
    const enrollments = await this.enrollmentRepository.find({
      where: { courseId },
    });

    const course = await this.courseRepository.findOne({ where: { id: courseId } });

    const stats = {
      totalEnrollments: enrollments.length,
      activeEnrollments: enrollments.filter(e => e.isActive()).length,
      completedEnrollments: enrollments.filter(e => e.isCompleted()).length,
      droppedEnrollments: enrollments.filter(e => e.isDropped()).length,
      averageProgress: 0,
      completionRate: 0,
      averageCompletionTime: 0,
      revenue: 0,
    };

    if (enrollments.length > 0) {
      // Calculate average progress
      const totalProgress = enrollments.reduce((sum, e) => sum + e.getCompletionPercentage(), 0);
      stats.averageProgress = Math.round((totalProgress / enrollments.length) * 100) / 100;

      // Calculate completion rate
      stats.completionRate = Math.round((stats.completedEnrollments / enrollments.length) * 100);

      // Calculate average completion time (only for completed enrollments)
      const completedEnrollments = enrollments.filter(e => e.isCompleted());
      if (completedEnrollments.length > 0) {
        const totalTime = completedEnrollments.reduce((sum, e) => sum + e.getEnrollmentDuration(), 0);
        stats.averageCompletionTime = Math.round(totalTime / completedEnrollments.length);
      }

      // Calculate revenue
      if (course && !course.isFree()) {
        stats.revenue = enrollments.length * course.price.getAmount();
      }
    }

    return stats;
  }

  async getRecommendedCourses(userId: string, limit: number = 5): Promise<Course[]> {
    // Get user's completed courses
    const completedEnrollments = await this.enrollmentRepository.find({
      where: { studentId: userId, status: 'completed' },
      relations: ['course'],
    });

    const completedCourseIds = completedEnrollments.map(e => e.courseId);
    const completedCourses = completedEnrollments.map(e => e.course);

    // Get user's active enrollments to exclude them
    const activeEnrollments = await this.enrollmentRepository.find({
      where: { studentId: userId, status: 'active' },
    });
    const activeCourseIds = activeEnrollments.map(e => e.courseId);

    // Extract levels and categories from completed courses
    const completedLevels = [...new Set(completedCourses.map(c => c.level))];
    const completedCategories = completedCourses
      .flatMap(c => c.categories?.map(cat => cat.id) || [])
      .filter((id, index, arr) => arr.indexOf(id) === index);

    // Find similar courses
    const queryBuilder = this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.categories', 'category')
      .where('course.status = :status', { status: 'published' })
      .andWhere('course.id NOT IN (:...excludedIds)', { 
        excludedIds: [...completedCourseIds, ...activeCourseIds] 
      });

    if (completedLevels.length > 0) {
      queryBuilder.andWhere('course.level IN (:...levels)', { levels: completedLevels });
    }

    if (completedCategories.length > 0) {
      queryBuilder.andWhere('category.id IN (:...categories)', { categories: completedCategories });
    }

    return queryBuilder
      .orderBy('course.createdAt', 'DESC')
      .limit(limit)
      .getMany();
  }

  async validateCourseForDeletion(courseId: string): Promise<{
    canDelete: boolean;
    reasons: string[];
  }> {
    const course = await this.courseRepository.findOne({ where: { id: courseId } });
    if (!course) {
      return { canDelete: false, reasons: ['Course not found'] };
    }

    const reasons: string[] = [];

    // Check if course has active enrollments
    const activeEnrollments = await this.enrollmentRepository.count({
      where: { courseId },
    });

    if (activeEnrollments > 0) {
      reasons.push('Course has active enrollments');
    }

    // Check if course is published
    if (course.isPublished()) {
      reasons.push('Published courses cannot be deleted (consider archiving instead)');
    }

    return {
      canDelete: reasons.length === 0,
      reasons,
    };
  }

  async getInstructorCourseStats(instructorId: string): Promise<{
    totalCourses: number;
    publishedCourses: number;
    draftCourses: number;
    archivedCourses: number;
    totalEnrollments: number;
    totalRevenue: number;
    averageRating: number;
  }> {
    const courses = await this.courseRepository.find({
      where: { instructorId },
    });

    const courseIds = courses.map(c => c.id);
    const enrollments = courseIds.length > 0 
      ? await this.enrollmentRepository.find({
          where: { courseId: courseIds as any },
        })
      : [];

    const stats = {
      totalCourses: courses.length,
      publishedCourses: courses.filter(c => c.isPublished()).length,
      draftCourses: courses.filter(c => c.isDraft()).length,
      archivedCourses: courses.filter(c => c.isArchived()).length,
      totalEnrollments: enrollments.length,
      totalRevenue: 0,
      averageRating: 0, // This would require ratings table
    };

    // Calculate total revenue
    stats.totalRevenue = courses
      .filter(c => c.isPublished() && !c.isFree())
      .reduce((sum, course) => {
        const courseEnrollments = enrollments.filter(e => e.courseId === course.id);
        return sum + (courseEnrollments.length * course.price.getAmount());
      }, 0);

    return stats;
  }
}
