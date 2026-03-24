import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CourseModule } from './entities/module.entity';
import { CreateCourseDto } from './dto/create-course.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { CreateModuleDto } from './dto/create-module.dto';
import { CourseVersion } from './entities/course-version.entity';
import { Course } from './entities/course.entity';
import { Enrollment } from './entities/enrollment.entity';
import { Lesson } from './entities/lesson.entity';
import { CourseStatus } from './enums/course-status.enum';
import { CourseEnrolledEvent, CourseCompletedEvent } from '../common/events/domain-events';

@Injectable()
export class CourseService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepo: Repository<Course>,
    @InjectRepository(CourseModule)
    private readonly moduleRepo: Repository<CourseModule>,
    @InjectRepository(Lesson)
    private readonly lessonRepo: Repository<Lesson>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepo: Repository<Enrollment>,
    @InjectRepository(CourseVersion)
    private readonly versionRepo: Repository<CourseVersion>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createCourse(dto: CreateCourseDto) {
    const course = this.courseRepo.create(dto);
    return this.courseRepo.save(course);
  }

  async addModule(courseId: string, dto: CreateModuleDto) {
    const course = await this.courseRepo.findOneBy({ id: courseId });
    const module = this.moduleRepo.create({ ...dto, course });
    return this.moduleRepo.save(module);
  }

  async addLesson(moduleId: string, dto: CreateLessonDto) {
    const module = await this.moduleRepo.findOneBy({ id: moduleId });
    const lesson = this.lessonRepo.create({ ...dto, module });
    return this.lessonRepo.save(lesson);
  }

  async enroll(studentId: string, courseId: string) {
    const course = await this.courseRepo.findOneBy({ id: courseId });
    const enrollment = await this.enrollmentRepo.save(
      this.enrollmentRepo.create({ studentId, course })
    );
    
    // Emit event instead of directly calling other services
    this.eventEmitter.emit('course.enrolled', new CourseEnrolledEvent(studentId, courseId));
    
    return enrollment;
  }

  async publishCourse(courseId: string) {
    const course = await this.courseRepo.findOne({
      where: { id: courseId },
      relations: ['modules', 'modules.lessons'],
    });

    const versionCount = await this.versionRepo.count({
      where: { course: { id: courseId } },
    });

    await this.versionRepo.save({
      course,
      version: versionCount + 1,
      snapshot: course,
    });

    course.status = CourseStatus.PUBLISHED;
    return this.courseRepo.save(course);
  }

  async completeCourse(userId: string, courseId: string) {
    // Mark course as completed
    const enrollment = await this.enrollmentRepo.findOne({
      where: { studentId: userId, course: { id: courseId } },
    });
    
    if (enrollment) {
      enrollment.completedAt = new Date();
      await this.enrollmentRepo.save(enrollment);
      
      // Emit event for other modules to react
      this.eventEmitter.emit('course.completed', new CourseCompletedEvent(userId, courseId));
    }
    
    return enrollment;
  }
}
