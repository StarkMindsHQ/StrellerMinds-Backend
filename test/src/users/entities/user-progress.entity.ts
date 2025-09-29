import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity';
import { Course } from '../../courses/entities/course.entity';
import { Lesson } from '../../lesson/entity/lesson.entity';
import { CourseModule } from '../../courses/entities/course-module.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * UserProgress entity representing a user's progress in a course or lesson.
 */
@Entity('user_progress')
@Index(['user', 'course', 'lesson'], { unique: true }) // Ensure unique progress per user/course/lesson
export class UserProgress {
  @ApiProperty({ description: 'Progress ID', example: 'uuid-v4' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Is completed', example: false })
  @Column({ default: false })
  isCompleted: boolean;

  @ApiProperty({ description: 'Progress percentage', example: 75.5 })
  @Column({ type: 'float', default: 0.0 })
  progressPercentage: number;

  @ApiPropertyOptional({ description: 'Flexible metadata', type: 'object' })
  @Column({ type: 'jsonb', nullable: true }) // Flexible metadata storage
  metadata: any;

  @ApiPropertyOptional({ description: 'Date completed', example: '2024-01-01T00:00:00Z' })
  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @ApiPropertyOptional({ description: 'Date last accessed', example: '2024-01-01T00:00:00Z' })
  @Column({ type: 'timestamp', nullable: true })
  lastAccessedAt: Date;

  @ManyToOne(() => User, (user) => user.progress)
  user: User;

  @ManyToOne(() => Course, (course) => course.userProgress)
  course: Course;

  @ManyToOne(() => CourseModule, { nullable: true })
  module: CourseModule;

  @ManyToOne(() => Lesson, { nullable: true }) // Optional relationship
  lesson: Lesson;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}