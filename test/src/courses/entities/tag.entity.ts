import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, CreateDateColumn, UpdateDateColumn } from "typeorm"
import { Course } from "./course.entity"

@Entity("tags")
export class Tag {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ length: 50, unique: true })
  name: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  // Many-to-Many relationship
  @ManyToMany(
    () => Course,
    (course) => course.tags,
  )
  courses: Course[]
}

