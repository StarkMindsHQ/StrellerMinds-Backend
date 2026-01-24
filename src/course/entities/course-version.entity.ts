import { Entity, PrimaryGeneratedColumn, ManyToOne, Column, CreateDateColumn } from "typeorm";
import { Course } from "./course.entity";

@Entity()
export class CourseVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Course, (course) => course.versions)
  course: Course;

  @Column()
  version: number;

  @Column({ type: 'json' })
  snapshot: any;

  @CreateDateColumn()
  createdAt: Date;
}
