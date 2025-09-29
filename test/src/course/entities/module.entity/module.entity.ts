import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Course } from '../course.entity/course.entity';
import { Lesson } from '../lesson.entity/lesson.entity';

@Entity()
export class Module {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @ManyToOne(() => Course, (course) => course.modules)
  course: Course;

  @OneToMany(() => Lesson, (lesson) => lesson.module, {
    cascade: true,
    eager: true,
  })
  lessons: Lesson[];
}
