
// src/courses/entities/course-review.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { Course } from './course.entity';
import { User } from '../../users/entities/user.entity';

@Entity('course_reviews')
export class CourseReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int', width: 1 })
  rating: number;

  @Column('text', { nullable: true })
  comment: string;

  @Column('uuid')
  @Index()
  userId: string;

  @ManyToOne(() => User)
  user: User;

  @Column('uuid')
  @Index()
  courseId: string;

  @ManyToOne(() => Course, course => course.reviewCount, { onDelete: 'CASCADE' })
  course: Course;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}