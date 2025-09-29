/**
 * AssignmentModule provides assignment management features.
 *
 * @module Assignment
 */
import { Module } from '@nestjs/common';
import { AssignmentService } from './assignment.service';
import { AssignmentController } from './assignment.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lesson } from 'src/lesson/entity/lesson.entity';
// import { Lesson } from 'src/modules/lesson/entities/lesson.entity';

@Module({
  controllers: [AssignmentController],
  providers: [AssignmentService],
  imports: [TypeOrmModule.forFeature([Lesson])],
})
export class AssignmentModule {}
