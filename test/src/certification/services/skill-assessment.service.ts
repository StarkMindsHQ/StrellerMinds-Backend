import { Injectable, NotFoundException, BadRequestException, Logger } from "@nestjs/common"
import type { Repository } from "typeorm"
import type { SkillAssessment } from "../entities/skill-assessment.entity"
import { type AssessmentAttempt, AttemptStatus } from "../entities/assessment-attempt.entity"
import type { CreateSkillAssessmentDto } from "../dto/create-skill-assessment.dto"
import type { StartAssessmentDto } from "../dto/start-assessment.dto"
import type { SubmitAssessmentDto } from "../dto/submit-assessment.dto"

@Injectable()
export class SkillAssessmentService {
  private readonly logger = new Logger(SkillAssessmentService.name)

  constructor(
    private assessmentRepository: Repository<SkillAssessment>,
    private attemptRepository: Repository<AssessmentAttempt>,
  ) {}

  async create(createDto: CreateSkillAssessmentDto): Promise<SkillAssessment> {
    const assessment = this.assessmentRepository.create(createDto)
    const saved = await this.assessmentRepository.save(assessment)

    this.logger.log(`Skill assessment created: ${saved.id}`)
    return saved
  }

  async findAll(): Promise<SkillAssessment[]> {
    return this.assessmentRepository.find({
      where: { isActive: true },
      order: { createdAt: "DESC" },
    })
  }

  async findOne(id: string): Promise<SkillAssessment> {
    const assessment = await this.assessmentRepository.findOne({
      where: { id },
      relations: ["attempts"],
    })

    if (!assessment) {
      throw new NotFoundException(`Assessment with ID ${id} not found`)
    }

    return assessment
  }

  async findBySkillArea(skillArea: string): Promise<SkillAssessment[]> {
    return this.assessmentRepository.find({
      where: { skillArea, isActive: true },
      order: { difficulty: "ASC", title: "ASC" },
    })
  }

  async startAssessment(startDto: StartAssessmentDto): Promise<AssessmentAttempt> {
    const assessment = await this.findOne(startDto.assessmentId)

    // Check if user has exceeded max attempts
    const previousAttempts = await this.attemptRepository.count({
      where: {
        userId: startDto.userId,
        assessmentId: startDto.assessmentId,
        status: AttemptStatus.COMPLETED,
      },
    })

    if (previousAttempts >= assessment.maxAttempts) {
      throw new BadRequestException("Maximum attempts exceeded")
    }

    // Check prerequisites
    await this.validatePrerequisites(startDto.userId, assessment)

    // Create new attempt
    const attempt = this.attemptRepository.create({
      userId: startDto.userId,
      assessmentId: startDto.assessmentId,
      attemptNumber: previousAttempts + 1,
      startedAt: new Date(),
      status: AttemptStatus.IN_PROGRESS,
    })

    const saved = await this.attemptRepository.save(attempt)
    this.logger.log(`Assessment attempt started: ${saved.id}`)

    return saved
  }

  async getAssessmentForAttempt(
    attemptId: string,
  ): Promise<{ assessment: SkillAssessment; attempt: AssessmentAttempt }> {
    const attempt = await this.attemptRepository.findOne({
      where: { id: attemptId },
      relations: ["assessment"],
    })

    if (!attempt) {
      throw new NotFoundException("Assessment attempt not found")
    }

    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new BadRequestException("Assessment attempt is not in progress")
    }

    // Check if time limit exceeded
    const timeElapsed = (Date.now() - attempt.startedAt.getTime()) / 1000 / 60 // minutes
    if (timeElapsed > attempt.assessment.timeLimit) {
      attempt.status = AttemptStatus.EXPIRED
      await this.attemptRepository.save(attempt)
      throw new BadRequestException("Assessment time limit exceeded")
    }

    // Return assessment without correct answers
    const assessmentForUser = {
      ...attempt.assessment,
      questions: attempt.assessment.questions.map((q) => ({
        id: q.id,
        question: q.question,
        type: q.type,
        options: q.options,
        points: q.points,
        timeLimit: q.timeLimit,
        resources: q.resources,
      })),
    }

    return {
      assessment: assessmentForUser,
      attempt,
    }
  }

  async submitAssessment(submitDto: SubmitAssessmentDto): Promise<AssessmentAttempt> {
    const attempt = await this.attemptRepository.findOne({
      where: { id: submitDto.attemptId },
      relations: ["assessment"],
    })

    if (!attempt) {
      throw new NotFoundException("Assessment attempt not found")
    }

    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new BadRequestException("Assessment attempt is not in progress")
    }

    // Calculate score
    const { score, percentage, feedback } = await this.calculateScore(attempt.assessment, submitDto.answers)

    // Update attempt
    attempt.answers = submitDto.answers
    attempt.score = score
    attempt.percentage = percentage
    attempt.passed = percentage >= attempt.assessment.passingScore
    attempt.status = AttemptStatus.COMPLETED
    attempt.completedAt = new Date()
    attempt.timeSpent = Math.floor((attempt.completedAt.getTime() - attempt.startedAt.getTime()) / 1000)
    attempt.feedback = feedback
    attempt.proctoring = submitDto.proctoring

    const updated = await this.attemptRepository.save(attempt)
    this.logger.log(`Assessment submitted: ${updated.id}, Score: ${percentage}%`)

    return updated
  }

  async getUserAttempts(userId: string, assessmentId?: string): Promise<AssessmentAttempt[]> {
    const where: any = { userId }
    if (assessmentId) {
      where.assessmentId = assessmentId
    }

    return this.attemptRepository.find({
      where,
      relations: ["assessment"],
      order: { startedAt: "DESC" },
    })
  }

  async getAssessmentStats(assessmentId: string) {
    const assessment = await this.findOne(assessmentId)

    const [totalAttempts, completedAttempts, passedAttempts] = await Promise.all([
      this.attemptRepository.count({ where: { assessmentId } }),
      this.attemptRepository.count({ where: { assessmentId, status: AttemptStatus.COMPLETED } }),
      this.attemptRepository.count({ where: { assessmentId, passed: true } }),
    ])

    const averageScore = await this.attemptRepository
      .createQueryBuilder("attempt")
      .select("AVG(attempt.percentage)", "avg")
      .where("attempt.assessmentId = :assessmentId", { assessmentId })
      .andWhere("attempt.status = :status", { status: AttemptStatus.COMPLETED })
      .getRawOne()

    return {
      assessment,
      stats: {
        totalAttempts,
        completedAttempts,
        passedAttempts,
        passRate: completedAttempts > 0 ? (passedAttempts / completedAttempts) * 100 : 0,
        averageScore: Number.parseFloat(averageScore?.avg || "0"),
      },
    }
  }

  private async validatePrerequisites(userId: string, assessment: SkillAssessment): Promise<void> {
    const prerequisites = assessment.prerequisites

    if (!prerequisites) return

    // Check required certifications
    if (prerequisites.requiredCertifications && prerequisites.requiredCertifications.length > 0) {
      // Implement certification check
    }

    // Check required courses
    if (prerequisites.requiredCourses && prerequisites.requiredCourses.length > 0) {
      // Implement course completion check
    }

    // Check minimum experience
    if (prerequisites.minimumExperience) {
      // Implement experience check
    }
  }

  private async calculateScore(
    assessment: SkillAssessment,
    answers: any[],
  ): Promise<{ score: number; percentage: number; feedback: any }> {
    let totalPoints = 0
    let earnedPoints = 0
    const questionFeedback: Record<string, string> = {}

    for (const question of assessment.questions) {
      totalPoints += question.points
      const userAnswer = answers.find((a) => a.questionId === question.id)

      if (userAnswer) {
        const isCorrect = this.checkAnswer(question, userAnswer.answer)
        if (isCorrect) {
          earnedPoints += question.points
        }

        // Generate feedback
        questionFeedback[question.id] = isCorrect
          ? "Correct!"
          : `Incorrect. The correct answer is: ${question.correctAnswer}`
      }
    }

    const percentage = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0

    const feedback = {
      overall:
        percentage >= assessment.passingScore
          ? "Congratulations! You passed the assessment."
          : "You did not meet the passing score. Please review the material and try again.",
      byQuestion: questionFeedback,
      recommendations: this.generateRecommendations(assessment, percentage),
    }

    return {
      score: earnedPoints,
      percentage: Math.round(percentage * 100) / 100,
      feedback,
    }
  }

  private checkAnswer(question: any, userAnswer: string | string[]): boolean {
    const correctAnswer = question.correctAnswer

    if (question.type === "multiple_choice") {
      return userAnswer === correctAnswer
    } else if (question.type === "true_false") {
      return userAnswer === correctAnswer
    } else if (question.type === "short_answer") {
      // Simple string comparison (you might want to implement fuzzy matching)
      return userAnswer.toString().toLowerCase().trim() === correctAnswer.toString().toLowerCase().trim()
    }

    return false
  }

  private generateRecommendations(assessment: SkillAssessment, percentage: number): string[] {
    const recommendations: string[] = []

    if (percentage < 50) {
      recommendations.push("Consider reviewing the fundamental concepts before retaking the assessment.")
      recommendations.push("Practice with additional resources and examples.")
    } else if (percentage < assessment.passingScore) {
      recommendations.push("You're close! Review the areas where you lost points.")
      recommendations.push("Focus on the specific topics that need improvement.")
    } else {
      recommendations.push("Great job! Consider taking more advanced assessments in this skill area.")
      recommendations.push("Share your achievement and consider mentoring others.")
    }

    return recommendations
  }
}
