import { Module } from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from './entities/course.entity';
import { CourseModule } from './entities/course-module.entity';
import { Category } from './entities/category.entity';
import { Tag } from './entities/tag.entity';
import { CourseReview } from './entities/course-review.entity';
import { CourseService } from './courses.service';
import { CourseController } from './courses.controller';
import { User } from 'src/users/entities/user.entity';
import { UsersModule } from 'src/users/users.module';
import { EmailModule } from 'src/email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Course,
      CourseModule,
      Category,
      Tag,
      CourseReview,
      User,
    ]),
    UsersModule,
    EmailModule,
  ],
  providers: [CourseService],
  controllers: [CourseController],
  exports: [CourseService],
})
export class CoursesModule {}
