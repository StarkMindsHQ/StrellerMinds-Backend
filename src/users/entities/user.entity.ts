import { CourseReview } from "src/courses/entities/course-review.entity"
import { Course } from "src/courses/entities/course.entity"
import { Payment } from "src/payment/entities/payment.entity"
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from "typeorm"
import { UserProgress } from "./user-progress.entity"
import { LessonProgress } from "../../progress/entities/lesson-progress.entity"
import { ForumPost } from "src/forum/entities/forum-post.entity"
import { Certificate } from "src/certificate/entity/certificate.entity"
import { ForumComment } from "src/forum/entities/forum-comment.entity"
import { AuthToken } from "src/auth/entities/auth-token.entity"
import { Notification } from "src/notification/entities/notification.entity"


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
  @OneToMany(
    () => Course,
    (course) => course.instructor,
  )
  instructorCourses: Course[]

  // User relationships
  @OneToMany(
    () => CourseReview,
    (review) => review.user,
  )
  reviews: CourseReview[]

  @OneToMany(
    () => Payment,
    (payment) => payment.user,
  )
  payments: Payment[]

  @OneToMany(
    () => UserProgress,
    (progress) => progress.user,
  )
  progress: UserProgress[]

  @OneToMany(() => LessonProgress, (lessonProgress) => lessonProgress.user)
  lessonProgress: LessonProgress[];

  @OneToMany(
    () => Certificate,
    (certificate) => certificate.user,
  )
  certificates: Certificate[]

  @OneToMany(
    () => ForumPost,
    (post) => post.author,
  )
  forumPosts: ForumPost[]

  @OneToMany(
    () => ForumComment,
    (comment) => comment.author,
  )
  forumComments: ForumComment[]

  @OneToMany(
    () => Notification,
    (notification) => notification.user,
  )
  notifications: Notification[]

  @OneToMany(
    () => AuthToken,
    (token) => token.user,
  )
  authTokens: AuthToken[]
}

