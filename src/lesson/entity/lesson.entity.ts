/* eslint-disable prettier/prettier */
// FIX: Changed to relative paths to resolve Jest module resolution errors
import { Course } from '../../courses/entities/course.entity';
import { CourseModule } from '../../courses/entities/course-module.entity';
import { UserProgress } from '../../users/entities/user-progress.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
// FIX: Changed to relative paths
import { Assignment } from '../../assignment/entities/assignment.entity';
import { LessonType } from '../../modules/lesson/enums/lesson-type.enum';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Entity representing a lesson within a course module.
 */
@Entity('lessons')
export class Lesson {
  /** Unique lesson ID */
  @ApiProperty({ description: 'Unique lesson ID', example: 'uuid-lesson' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Lesson title */
  @ApiProperty({ description: 'Lesson title', example: 'Introduction to Algebra' })
  @Column({ length: 255 })
  title!: string;

  /** Lesson content (text, HTML, etc.) */
  @ApiProperty({ description: 'Lesson content', example: '<p>Welcome to Algebra!</p>' })
  @Column({ type: 'text' })
  content!: string;

  /** Lesson type (text, video, quiz, etc.) */
  @ApiProperty({ description: 'Lesson type', enum: LessonType, default: LessonType.TEXT })
  @Column({
    type: 'enum',
    enum: LessonType,
    default: LessonType.TEXT,
  })
  type!: LessonType;

  /** Video URL (if applicable) */
  @ApiProperty({ description: 'Video URL', required: false })
  @Column({ nullable: true })
  videoUrl?: string;

  /** Order of the lesson within the module */
  @ApiProperty({ description: 'Order of the lesson within the module', example: 1 })
  @Column()
  order!: number;

  /** Duration of the lesson in minutes */
  @ApiProperty({ description: 'Duration in minutes', example: 30 })
  @Column({ default: 0 })
  durationInMinutes!: number;

  /** Date lesson was created */
  @ApiProperty({ description: 'Creation date' })
  @CreateDateColumn()
  createdAt!: Date;

  /** Date lesson was last updated */
  @ApiProperty({ description: 'Last update date' })
  @UpdateDateColumn()
  updatedAt!: Date;

  /** Module this lesson belongs to */
  @ApiProperty({ description: 'Module this lesson belongs to', type: () => CourseModule })
  @ManyToOne(() => CourseModule, (module) => module.lessons, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @Index()
  module!: CourseModule;

  // One-to-Many relationship
  @OneToMany(() => UserProgress, (progress) => progress.lesson)
  userProgress!: Promise<UserProgress[]>;

  @ManyToOne(() => Course, (course) => course.lessons, { onDelete: 'CASCADE' })
  course!: Course;

  @OneToMany(() => Assignment, (assignment) => assignment.lesson)
  assignments!: Assignment[];
}