import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinTable,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm"
import { Category } from "./category.entity"
import { Tag } from "./tag.entity"
import { CourseReview } from "./course-review.entity"
import { User } from "../../users/entities/user.entity"
import { CourseModule } from './course-module.entity'
import { Certificate } from "../../certificate/entity/certificate.entity"
import { Payment } from "../../payment/entities/payment.entity"
import { UserProgress } from "../../users/entities/user-progress.entity"


@Entity("courses")
export class Course {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ length: 255 })
  title: string

  @Column({ type: "text" })
  description: string

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  price: number

  @Column({ default: 0 })
  durationInHours: number

  @Column({ default: "draft" })
  status: string // draft, published, archived

  @Column({ nullable: true })
  thumbnail: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  // Many-to-One relationships
  @ManyToOne(() => User, (user) => user.instructorCourses, { nullable: false })
  @Index()
  instructor: Promise<User>

  @ManyToOne(() => Category, (category) => category.courses, { nullable: false })
  @Index()
  category: Promise<Category>

  // One-to-Many relationships
  @OneToMany(() => CourseModule, (module) => module.course, { cascade: true })
  modules: Promise<CourseModule[]>

  @OneToMany(() => Certificate, (certificate) => certificate.course)
  certificates: Promise<Certificate[]>

  @OneToMany(() => CourseReview, (review) => review.course)
  reviews: Promise<CourseReview[]>

  @OneToMany(() => Payment, (payment) => payment.course)
  payments: Promise<Payment[]>

  @OneToMany(() => UserProgress, (progress) => progress.course)
  userProgress: Promise<UserProgress[]>

  // Many-to-Many relationship
  @ManyToMany(() => Tag, (tag) => tag.courses)
  @JoinTable({
    name: "course_tags",
    joinColumn: { name: "course_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "tag_id", referencedColumnName: "id" },
  })
  tags: Promise<Tag[]>
}

