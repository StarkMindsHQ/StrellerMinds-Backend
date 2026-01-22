import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from "typeorm";
import { Course } from "./course.entity";
import { Lesson } from "./lesson.entity";

@Entity()
export class CourseModule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column()
  order: number;

  @ManyToOne(() => Course, (course) => course.modules, {
    onDelete: 'CASCADE',
  })
  course: Course;

  @OneToMany(() => Lesson, (lesson) => lesson.module, {
    cascade: true,
  })
  lessons: Lesson[];
}
