import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, OneToMany } from "typeorm"
import { AssessmentAttempt } from "./assessment-attempt.entity"

export enum AssessmentType {
  MULTIPLE_CHOICE = "multiple_choice",
  PRACTICAL = "practical",
  PROJECT = "project",
  ORAL = "oral",
  MIXED = "mixed",
}

export enum AssessmentDifficulty {
  EASY = "easy",
  MEDIUM = "medium",
  HARD = "hard",
  EXPERT = "expert",
}

@Entity("skill_assessments")
@Index(["skillArea"])
@Index(["isActive"])
export class SkillAssessment {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ length: 255 })
  title: string

  @Column({ type: "text" })
  description: string

  @Column({ length: 100 })
  skillArea: string

  @Column({
    type: "enum",
    enum: AssessmentType,
    default: AssessmentType.MULTIPLE_CHOICE,
  })
  type: AssessmentType

  @Column({
    type: "enum",
    enum: AssessmentDifficulty,
    default: AssessmentDifficulty.MEDIUM,
  })
  difficulty: AssessmentDifficulty

  @Column({ type: "json" })
  questions: {
    id: string
    question: string
    type: "multiple_choice" | "true_false" | "short_answer" | "essay" | "practical"
    options?: string[]
    correctAnswer?: string | string[]
    points: number
    timeLimit?: number // in seconds
    resources?: string[]
  }[]

  @Column({ type: "int", default: 60 })
  timeLimit: number // in minutes

  @Column({ type: "decimal", precision: 5, scale: 2, default: 70 })
  passingScore: number

  @Column({ type: "int", default: 3 })
  maxAttempts: number

  @Column({ default: true })
  isActive: boolean

  @Column({ type: "json", nullable: true })
  prerequisites: {
    requiredCertifications?: string[]
    requiredCourses?: string[]
    minimumExperience?: number
  }

  @Column({ type: "json", nullable: true })
  settings: {
    randomizeQuestions?: boolean
    showResults?: boolean
    allowReview?: boolean
    proctored?: boolean
    certificateEligible?: boolean
  }

  @OneToMany(
    () => AssessmentAttempt,
    (attempt) => attempt.assessment,
  )
  attempts: AssessmentAttempt[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
