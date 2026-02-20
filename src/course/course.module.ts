import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseController } from './course.controller';
import { CourseModule as CourseModuleEntity } from './entities/module.entity';
import { CourseService } from './course.service';
import { CourseVersion } from './entities/course-version.entity';
import { Course } from './entities/course.entity';
import { Enrollment } from './entities/enrollment.entity';
import { Lesson } from './entities/lesson.entity';
import { Module } from '@nestjs/common/decorators';

@Module({
  imports: [
    TypeOrmModule.forFeature([Course, CourseModuleEntity, Lesson, Enrollment, CourseVersion]),
  ],
  controllers: [CourseController],
  providers: [CourseService],
})
export class CourseModule {}
