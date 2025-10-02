import { Module } from '@nestjs/common';
import { LessonController } from './lesson.controller';
import { LessonService } from './lesson.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lesson } from './entity/lesson.entity';
import { CourseModule } from '../courses/entities/course-module.entity';
import { UserProgress } from '../users/entities/user-progress.entity';
import { Assignment } from 'src/assignment/entities/assignment.entity';
import { Module as ModuleEntity } from 'src/module/entities/module.entity';
import { ApiTags } from '@nestjs/swagger';

/**
 * Lesson module for managing lessons, their assignments, and progress.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Lesson, Assignment, CourseModule, UserProgress, ModuleEntity]),
  ],
  controllers: [LessonController],
  providers: [LessonService],
  exports: [LessonService],
})
export class LessonModule {}
