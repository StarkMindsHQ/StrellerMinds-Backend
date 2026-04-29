import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseController } from './course.controller';
import { CourseService } from './course.service';
import { Course } from './entities/course.entity';
import { CoursePersistenceEntity } from './infrastructure/persistence/course-persistence.entity';
import { CourseRepositoryImpl } from './infrastructure/repositories/course-repository.impl';
import { CourseMapper } from './application/mappers/course.mapper';
import { ListCoursesUseCase } from './application/use-cases/list-courses.use-case';
import { GetCourseUseCase } from './application/use-cases/get-course.use-case';
import { COURSE_REPOSITORY } from './domain/repositories/course-repository.interface';
import { AppCacheModule } from '../common/cache/cache.module';

@Module({
  imports: [TypeOrmModule.forFeature([Course, CoursePersistenceEntity]), AppCacheModule],
  controllers: [CourseController],
  providers: [
    CourseService,
    CourseMapper,
    { provide: COURSE_REPOSITORY, useClass: CourseRepositoryImpl },
    ListCoursesUseCase,
    GetCourseUseCase,
  ],
  exports: [CourseService],
})
export class CourseModule {}
