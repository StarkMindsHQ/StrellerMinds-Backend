import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from "typeorm";
import { Course } from "./course.entity";

@Entity()
export class Enrollment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  studentId: string;

  @ManyToOne(() => Course)
  course: Course;

  @Column({ default: 'active' })
  status: string;

  @CreateDateColumn()
  enrolledAt: Date;
}
