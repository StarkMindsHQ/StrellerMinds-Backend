import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Index, CreateDateColumn, UpdateDateColumn } from "typeorm"
import { User } from "./user.entity"
import { Course } from "../../courses/entities/course.entity"
import { Lesson } from "../../lesson/entity/lesson.entity"


@Entity("user_progress")
export class UserProgress {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ default: false })
  isCompleted: boolean

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  progressPercentage: number

  @Column({ nullable: true, type: "json" })
  metadata: Record<string, any>

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  // Many-to-One relationships
  @ManyToOne(
    () => User,
    (user) => user.progress,
    { nullable: false },
  )
  @Index()
  user: User

  @ManyToOne(
    () => Course,
    (course) => course.userProgress,
    { nullable: false },
  )
  @Index()
  course: Course

  @ManyToOne(
    () => Lesson,
    (lesson) => lesson.userProgress,
    { nullable: true },
  )
  @Index()
  lesson: Lesson
}

