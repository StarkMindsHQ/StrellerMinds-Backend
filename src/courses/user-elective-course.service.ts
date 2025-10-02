import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserElectiveCourse } from './entities/user-elective-course.entity';
import { ElectiveCourse } from 'src/elective-course/entities/elective-course.entity';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class UserElectiveCourseService {
  constructor(
    @InjectRepository(UserElectiveCourse)
    private readonly enrollmentRepo: Repository<UserElectiveCourse>,
  ) {}

  async enroll(user: User, course: ElectiveCourse) {
    const enrollment = this.enrollmentRepo.create({ user, electiveCourse: course });
    return this.enrollmentRepo.save(enrollment);
  }

  async getEnrollments(userId: string) {
    return this.enrollmentRepo.find({
      where: { user: { id: userId } },
      relations: ['electiveCourse'],
    });
  }

  async unenroll(userId: string, courseId: string) {
    const enrollment = await this.enrollmentRepo.findOne({
      where: { user: { id: userId }, electiveCourse: { id: courseId } },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    return this.enrollmentRepo.remove(enrollment);
  }
}
