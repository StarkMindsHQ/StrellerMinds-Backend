// src/progress/progress.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProgressService } from './progress.service';
import { ProgressController } from './progress.controller';
import { UserProgress } from 'src/users/entities/user-progress.entity';
import { LessonProgress } from 'src/progress/entities/lesson-progress.entity';
import { Course } from 'src/courses/entities/course.entity';
import { Lesson } from 'src/lesson/enitity/lesson.entity';
import { User } from 'src/users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserProgress,
      LessonProgress,
      Course,
      Lesson,
      User,
    ]),
  ],
  controllers: [ProgressController],
  providers: [ProgressService],
  exports: [ProgressService],
})
export class ProgressModule {}