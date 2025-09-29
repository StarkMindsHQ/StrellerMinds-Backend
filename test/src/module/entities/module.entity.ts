import { Course } from "../../courses/entities/course.entity"
import { Lesson } from "../../lesson/entity/lesson.entity"
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm"
import { ApiProperty } from '@nestjs/swagger';

/**
 * Entity representing a course module containing lessons.
 */
@Entity("modules")
export class Module {
  /** Unique module ID */
  @ApiProperty({ description: 'Unique module ID', example: 'uuid-module' })
  @PrimaryGeneratedColumn("uuid")
  id: string

  /** Module title */
  @ApiProperty({ description: 'Module title', example: 'Algebra Basics' })
  @Column({ length: 255 })
  title: string

  /** Module description */
  @ApiProperty({ description: 'Module description', required: false })
  @Column({ type: "text", nullable: true })
  description: string

  /** Order of the module within the course */
  @ApiProperty({ description: 'Order of the module within the course', example: 1 })
  @Column()
  order: number

  /** Date module was created */
  @ApiProperty({ description: 'Creation date' })
  @CreateDateColumn()
  createdAt: Date

  /** Date module was last updated */
  @ApiProperty({ description: 'Last update date' })
  @UpdateDateColumn()
  updatedAt: Date

  /** Course this module belongs to */
  @ApiProperty({ description: 'Course this module belongs to', type: () => Course })
  @ManyToOne(
    () => Course,
    (course) => course.modules,
    { nullable: false, onDelete: "CASCADE" },
  )
  @Index()
  course: Promise<Course>

  /** Lessons in this module */
  @ApiProperty({ description: 'Lessons in this module', type: () => [Lesson] })
  @OneToMany(
    () => Lesson,
    (lesson) => lesson.module,
    { cascade: true },
  )
  lessons: Promise<Lesson[]>
}

