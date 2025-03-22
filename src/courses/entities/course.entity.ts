import { Column, CreateDateColumn, Entity, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm"
import { CourseReview } from "./course-review.entity"
import { Tag } from "./tag.entity"
import { Category } from "./category.entity"
import { CourseModule } from "./course-module.entity"
import { User } from "src/users/entities/user.entity"

@Entity("courses")
export class Course {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  title: string

  @Column({ type: "text" })
  description: string

  @Column({ nullable: true })
  thumbnail: string

  @Column({ nullable: true })
  introVideo: string

  @Column({ type: "float", nullable: true })
  price: number

  @Column({ default: "XLM" })
  currency: string

  @Column({ default: false })
  isFeatured: boolean

  @Column({ default: false })
  isPublished: boolean

  @Column({ default: 0 })
  enrollmentCount: number

  @Column({ type: "float", default: 0 })
  averageRating: number

  @Column({ default: 0 })
  reviewCount: number

  @Column({ nullable: true })
  duration: string

  @Column({ nullable: true })
  level: string

  @Column({ type: "jsonb", nullable: true })
  requirements: string[]

  @Column({ type: "jsonb", nullable: true })
  learningOutcomes: string[]

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>

  @Column()
  instructorId: string

  @Column({ nullable: true })
  categoryId: string

  
  @ManyToOne(() => User, user => user.intructorCourses)
  instructor: User;

  @OneToMany(() => CourseModule, module => module.course, { cascade: true })
  modules: CourseModule[];

  @ManyToOne(() => Category, category => category.courses)
  category: Category;

  @ManyToMany(() => Tag)
  @JoinTable({
    name: 'course_tags',
    joinColumn: { name: 'course_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tag_id', referencedColumnName: 'id' }
  })
  tags: Tag[];

  @OneToMany(() => CourseReview, review => review.course)
  reviews: CourseReview[];


  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}