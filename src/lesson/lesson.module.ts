import { Module } from '@nestjs/common';
import { LessonController } from './lesson.controller';
import { LessonService } from './lesson.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lesson } from './entity/lesson.entity';
import { CourseModule } from '../courses/entities/course-module.entity';
import { UserProgress } from '../users/entities/user-progress.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Lesson, CourseModule, UserProgress])],
  controllers: [LessonController],
  providers: [LessonService],
  exports: [TypeOrmModule],
})
export class LessonModule {}
