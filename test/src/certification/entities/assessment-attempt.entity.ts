import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm"
import { SkillAssessment } from "./skill-assessment.entity"

export enum AttemptStatus {
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  ABANDONED = "abandoned",
  EXPIRED = "expired",
}

@Entity("assessment_attempts")
@Index(["userId"])
@Index(["status"])
@Index(["startedAt"])
export class AssessmentAttempt {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "uuid" })
  userId: string

  @Column({ type: "uuid" })
  assessmentId: string

  @ManyToOne(
    () => SkillAssessment,
    (assessment) => assessment.attempts,
  )
  @JoinColumn({ name: "assessmentId" })
  assessment: SkillAssessment

  @Column({
    type: "enum",
    enum: AttemptStatus,
    default: AttemptStatus.IN_PROGRESS,
  })
  status: AttemptStatus

  @Column({ type: "json", nullable: true })
  answers: {
    questionId: string
    answer: string | string[]
    timeSpent: number // in seconds
    isCorrect?: boolean
    points?: number
  }[]

  @Column({ type: "decimal", precision: 5, scale: 2, nullable: true })
  score: number

  @Column({ type: "decimal", precision: 5, scale: 2, nullable: true })
  percentage: number

  @Column({ default: false })
  passed: boolean

  @Column({ type: "int", default: 1 })
  attemptNumber: number

  @Column({ type: "timestamp" })
  startedAt: Date

  @Column({ type: "timestamp", nullable: true })
  completedAt: Date

  @Column({ type: "int", nullable: true })
  timeSpent: number // total time in seconds

  @Column({ type: "json", nullable: true })
  feedback: {
    overall?: string
    byQuestion?: Record<string, string>
    recommendations?: string[]
  }

  @Column({ type: "json", nullable: true })
  proctoring: {
    violations?: string[]
    screenshots?: string[]
    webcamRecording?: string
    screenRecording?: string
  }

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
