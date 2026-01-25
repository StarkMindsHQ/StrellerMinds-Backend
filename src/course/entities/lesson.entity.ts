import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { CourseModule } from "./module.entity";

@Entity()
export class Lesson {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'json' })
  content: any; // Rich text (TipTap JSON)

  @Column()
  order: number;

  @Column({ default: true })
  isDraft: boolean;

  @ManyToOne('CourseModule', 'lessons', {
    onDelete: 'CASCADE',
  })
  module: CourseModule;
}
