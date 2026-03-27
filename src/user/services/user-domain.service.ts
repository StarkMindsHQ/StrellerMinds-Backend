import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user-rich.entity';
import { Course } from '../../course/entities/course-rich.entity';
import { Enrollment } from '../../course/entities/enrollment-rich.entity';

@Injectable()
export class UserDomainService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,
  ) {}

  async canUserEnrollInCourse(userId: string, courseId: string): Promise<boolean> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || !user.canLogin()) {
      return false;
    }

    const existingEnrollment = await this.enrollmentRepository.findOne({
      where: { studentId: userId, courseId },
    });

    if (existingEnrollment) {
      return false;
    }

    return true;
  }

  async getUserEnrollmentStats(userId: string): Promise<{
    totalEnrollments: number;
    activeEnrollments: number;
    completedEnrollments: number;
    droppedEnrollments: number;
    averageProgress: number;
  }> {
    const enrollments = await this.enrollmentRepository.find({
      where: { studentId: userId },
    });

    const stats = {
      totalEnrollments: enrollments.length,
      activeEnrollments: enrollments.filter(e => e.isActive()).length,
      completedEnrollments: enrollments.filter(e => e.isCompleted()).length,
      droppedEnrollments: enrollments.filter(e => e.isDropped()).length,
      averageProgress: 0,
    };

    if (enrollments.length > 0) {
      const totalProgress = enrollments.reduce((sum, e) => sum + e.getCompletionPercentage(), 0);
      stats.averageProgress = Math.round((totalProgress / enrollments.length) * 100) / 100;
    }

    return stats;
  }

  async isUserEligibleForCertificate(userId: string, courseId: string): Promise<boolean> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { studentId: userId, courseId },
    });

    return enrollment?.isCompleted() || false;
  }

  async getUsersWithInactiveEnrollments(days: number): Promise<User[]> {
    const inactiveEnrollments = await this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .where('enrollment.lastAccessedAt < :date', { 
        date: new Date(Date.now() - days * 24 * 60 * 60 * 1000) 
      })
      .andWhere('enrollment.status = :status', { status: 'active' })
      .getMany();

    const userIds = [...new Set(inactiveEnrollments.map(e => e.studentId))];
    
    if (userIds.length === 0) {
      return [];
    }

    return this.userRepository.findByIds(userIds);
  }

  async validateUserForDeletion(userId: string): Promise<{
    canDelete: boolean;
    reasons: string[];
  }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      return { canDelete: false, reasons: ['User not found'] };
    }

    const reasons: string[] = [];

    // Check if user has active enrollments
    const activeEnrollments = await this.enrollmentRepository.count({
      where: { studentId: userId },
    });

    if (activeEnrollments > 0) {
      reasons.push('User has active course enrollments');
    }

    // Check if user is an instructor of any courses
    const courseCount = await this.userRepository
      .createQueryBuilder('user')
      .leftJoin('user.courses', 'course')
      .where('user.id = :userId', { userId })
      .getCount();

    if (courseCount > 0) {
      reasons.push('User is an instructor of courses');
    }

    // Check if user has admin privileges
    if (user.hasRole('admin') || user.hasRole('super_admin')) {
      reasons.push('User has administrative privileges');
    }

    return {
      canDelete: reasons.length === 0,
      reasons,
    };
  }
}
