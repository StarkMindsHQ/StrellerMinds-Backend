import { Injectable } from '@nestjs/common';
import { ICourseService } from '../common/interfaces/module-interfaces';
import { CourseService } from './course.service';

@Injectable()
export class CourseFacade implements ICourseService {
  constructor(private readonly courseService: CourseService) {}

  async findById(id: string): Promise<any> {
    return this.courseService.courseRepo.findOne({ where: { id } });
  }

  async enrollUser(userId: string, courseId: string): Promise<any> {
    return this.courseService.enroll(userId, courseId);
  }

  async getCourseProgress(userId: string, courseId: string): Promise<any> {
    return { userId, courseId, progress: 0 };
  }
}
