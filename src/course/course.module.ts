import { Module } from '@nestjs/common';
import { CourseController } from './course.controller';
import { CourseService } from './course.service';
import { ShardedCourseRepository } from './repositories/sharded-course.repository';
import { ShardingModule } from '../database/sharding/sharding.module';

@Module({
  imports: [ShardingModule],
  controllers: [CourseController],
  providers: [CourseService, ShardedCourseRepository],
  exports: [CourseService, ShardedCourseRepository],
})
export class CourseModule {}
