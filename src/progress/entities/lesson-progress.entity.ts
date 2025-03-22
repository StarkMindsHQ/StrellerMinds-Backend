import { Entity, PrimaryGeneratedColumn, ManyToOne, Column, Index, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { User } from "src/users/entities/user.entity";
import { Lesson } from "src/lesson/enitity/lesson.entity";

@Entity("lesson_progress")
export class LessonProgress {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, (user) => user.lessonProgress)
  @Index()
  user: User;

  @ManyToOne(() => Lesson, (lesson) => lesson.userProgress)
  @Index()
  lesson: Lesson;

  @Column({ default: false })
  completed: boolean;

  @Column({ nullable: true, type: "timestamp" })
  completedAt: Date;

  @Column({ nullable: true, type: "json" })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}