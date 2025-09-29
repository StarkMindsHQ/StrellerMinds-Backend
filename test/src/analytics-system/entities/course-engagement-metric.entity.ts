import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm"
import { Course } from "../../courses/entities/course.entity"

@Entity("course_engagement_metrics")
@Index(["courseId", "date"])
export class CourseEngagementMetric {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "uuid" })
  courseId: string

  @Column({ type: "date" })
  date: Date // Date for which the metrics are aggregated (e.g., daily)

  @Column({ type: "int", default: 0 })
  totalEnrollments: number

  @Column({ type: "int", default: 0 })
  totalCompletions: number

  @Column({ type: "float", default: 0 })
  averageProgress: number // Average progress of active users (0-100)

  @Column({ type: "float", default: 0 })
  averageTimeSpent: number // Average time spent in minutes

  @Column({ type: "float", default: 0 })
  dropOffRate: number // Percentage of users who dropped off

  @Column({ type: "int", default: 0 })
  activeUsers: number // Number of unique active users on this course for the day

  @Column({ type: "jsonb", nullable: true })
  lessonEngagement: Record<string, any> | null // Engagement per lesson

  @CreateDateColumn({ type: "timestamp" })
  createdAt: Date

  @UpdateDateColumn({ type: "timestamp" })
  updatedAt: Date

  @ManyToOne(
    () => Course,
    (course) => course.engagementMetrics,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "courseId" })
  course: Course
}
