import { IsString, IsEnum, IsArray, IsNumber, IsBoolean, IsOptional, IsObject, Min, Max } from "class-validator"
import { AssessmentType, AssessmentDifficulty } from "../entities/skill-assessment.entity"

export class CreateSkillAssessmentDto {
  @IsString()
  title: string

  @IsString()
  description: string

  @IsString()
  skillArea: string

  @IsEnum(AssessmentType)
  type: AssessmentType

  @IsEnum(AssessmentDifficulty)
  difficulty: AssessmentDifficulty

  @IsArray()
  questions: {
    id: string
    question: string
    type: "multiple_choice" | "true_false" | "short_answer" | "essay" | "practical"
    options?: string[]
    correctAnswer?: string | string[]
    points: number
    timeLimit?: number
    resources?: string[]
  }[]

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(480)
  timeLimit?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  passingScore?: number

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  maxAttempts?: number

  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @IsOptional()
  @IsObject()
  prerequisites?: {
    requiredCertifications?: string[]
    requiredCourses?: string[]
    minimumExperience?: number
  }

  @IsOptional()
  @IsObject()
  settings?: {
    randomizeQuestions?: boolean
    showResults?: boolean
    allowReview?: boolean
    proctored?: boolean
    certificateEligible?: boolean
  }
}
