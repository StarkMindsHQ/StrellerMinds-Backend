// src/courses/entities/course-module.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { Course } from './course.entity';
import { Lesson } from '../../lesson/entity/lesson.entity';

@Entity('course_modules')
export class CourseModule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text', { nullable: true })
  description: string;

  @Column({ default: 0 })
  order: number;

  @Column({ default: 0 })
  durationInMinutes: number;

  @Column('uuid')
  @Index()
  courseId: string;

  @ManyToOne(() => Course, (course) => course.modules, { onDelete: 'CASCADE' })
  course: Promise<Course>;

  @Column({ nullable: true })
  contentUrl: string;

  @Column({ default: false })
  isPublished: boolean;

  @OneToMany(() => Lesson, (lesson) => lesson.module, { cascade: true })
  lessons: Lesson[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
