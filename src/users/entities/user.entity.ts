import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from "typeorm"
import { Course } from "../../courses/entities/course.entity"
import { CourseReview } from "../../courses/entities/course-review.entity"
import { Payment } from "../../payment/entities/payment.entity"
import { UserProgress } from "./user-progress.entity"
import { LessonProgress } from "../../progress/entities/lesson-progress.entity"
import { ForumPost } from "../../forum/entities/forum-post.entity"
import { Certificate } from "../../certificate/entity/certificate.entity"
import { ForumComment } from "../../forum/entities/forum-comment.entity"
import { AuthToken } from "../../auth/entities/auth-token.entity"
import { Notification } from "../../notification/entities/notification.entity"

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ length: 100 })
  firstName: string

  @Column({ length: 100 })
  lastName: string

  @Column({ unique: true })
  email: string

  @Column({ select: false })
  password: string

  @Column({ default: false })
  isInstructor: boolean

  @Column({ nullable: true, type: "text" })
  bio: string

  @Column({ nullable: true })
  profilePicture: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  // Instructor relationship
  @OneToMany(() => Course, (course) => course.instructor)
  instructorCourses: Promise<Course[]>

  // User relationships
  @OneToMany(() => CourseReview, (review) => review.user)
  reviews: Promise<CourseReview[]>

  @OneToMany(() => Payment, (payment) => payment.user)
  payments: Promise<Payment[]>

  @OneToMany(() => UserProgress, (progress) => progress.user)
  progress: Promise<UserProgress[]>

  @OneToMany(() => LessonProgress, (lessonProgress) => lessonProgress.user)
  lessonProgress: LessonProgress[];

  @OneToMany(
    () => Certificate,
    (certificate) => certificate.user,
  )
  certificates: Promise<Certificate[]>

  @OneToMany(
    () => ForumPost,
    (post) => post.author,
  )
  forumPosts: Promise<ForumPost[]>

  @OneToMany(
    () => ForumComment,
    (comment) => comment.author,
  )
  forumComments: Promise<ForumComment[]>

  @OneToMany(
    () => Notification,
    (notification) => notification.user,
  )
  notifications: Promise<Notification[]>

  @OneToMany(
    () => AuthToken,
    (token) => token.user,
  )
  authTokens: Promise<AuthToken[]>
}

