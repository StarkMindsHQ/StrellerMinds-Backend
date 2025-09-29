import { Injectable, Logger } from "@nestjs/common"
import { type Repository, Between, MoreThanOrEqual } from "typeorm"
import type { UserCourseInteraction } from "../../users/entities/user-course-interaction.entity"
import type { Course } from "../../courses/entities/course.entity"
import type { User } from "../../users/entities/user.entity"
import type { CourseEngagementMetric } from "../entities/course-engagement-metric.entity"
import { Cron, CronExpression } from "@nestjs/schedule"

@Injectable()
export class AnalyticsDataService {
  private readonly logger = new Logger(AnalyticsDataService.name)

  constructor(
    userInteractionRepository: Repository<UserCourseInteraction>,
    courseRepository: Repository<Course>,
    userRepository: Repository<User>,
    courseEngagementMetricRepository: Repository<CourseEngagementMetric>,
  ) {
    this.userInteractionRepository = userInteractionRepository
    this.courseRepository = courseRepository
    this.userRepository = userRepository
    this.courseEngagementMetricRepository = courseEngagementMetricRepository
  }

  private readonly userInteractionRepository: Repository<UserCourseInteraction>
  private readonly courseRepository: Repository<Course>
  private readonly userRepository: Repository<User>
  private readonly courseEngagementMetricRepository: Repository<CourseEngagementMetric>

  async getCourseInteractions(
    courseId?: string,
    userId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<UserCourseInteraction[]> {
    const where: any = {}
    if (courseId) where.courseId = courseId
    if (userId) where.userId = userId
    if (startDate && endDate) where.createdAt = Between(startDate, endDate)
    else if (startDate) where.createdAt = MoreThanOrEqual(startDate)

    return this.userInteractionRepository.find({
      where,
      relations: ["course", "user"],
    })
  }

  async getCourses(courseId?: string, instructorId?: string): Promise<Course[]> {
    const where: any = {}
    if (courseId) where.id = courseId
    if (instructorId) where.instructorId = instructorId // Assuming instructorId exists on Course entity or can be joined
    return this.courseRepository.find({ where })
  }

  async getUsers(userId?: string): Promise<User[]> {
    const where: any = {}
    if (userId) where.id = userId
    return this.userRepository.find({ where })
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async aggregateDailyCourseEngagementMetrics() {
    this.logger.log("Starting daily course engagement aggregation...")
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Start of today

    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)

    try {
      const courses = await this.courseRepository.find()

      for (const course of courses) {
        const interactions = await this.userInteractionRepository.find({
          where: {
            courseId: course.id,
            createdAt: Between(yesterday, today),
          },
          relations: ["user"],
        })

        const totalEnrollments = interactions.filter((i) => i.progress === 0).length
        const totalCompletions = interactions.filter((i) => i.completed).length
        const activeUsers = new Set(interactions.map((i) => i.userId)).size

        let totalProgress = 0
        let totalTimeSpent = 0
        let dropOffCount = 0

        interactions.forEach((i) => {
          totalProgress += i.progress || 0
          totalTimeSpent += i.timeSpent || 0
          if (i.progress > 0 && !i.completed && i.timeSpent < course.duration * 0.2) {
            dropOffCount++ // Simple heuristic for drop-off
          }
        })

        const averageProgress = activeUsers > 0 ? totalProgress / activeUsers : 0
        const averageTimeSpent = activeUsers > 0 ? totalTimeSpent / activeUsers : 0
        const dropOffRate = totalEnrollments > 0 ? (dropOffCount / totalEnrollments) * 100 : 0

        let metric = await this.courseEngagementMetricRepository.findOne({
          where: { courseId: course.id, date: yesterday },
        })

        if (!metric) {
          metric = this.courseEngagementMetricRepository.create({
            courseId: course.id,
            date: yesterday,
          })
        }

        metric.totalEnrollments = totalEnrollments
        metric.totalCompletions = totalCompletions
        metric.averageProgress = averageProgress
        metric.averageTimeSpent = averageTimeSpent
        metric.dropOffRate = dropOffRate
        metric.activeUsers = activeUsers

        await this.courseEngagementMetricRepository.save(metric)
      }
      this.logger.log("Daily course engagement aggregation completed.")
    } catch (error) {
      this.logger.error("Error during daily course engagement aggregation:", error.stack)
    }
  }

  async getAggregatedCourseMetrics(
    courseId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<CourseEngagementMetric[]> {
    const where: any = { courseId }
    if (startDate && endDate) where.date = Between(startDate, endDate)
    else if (startDate) where.date = MoreThanOrEqual(startDate)

    return this.courseEngagementMetricRepository.find({ where, order: { date: "ASC" } })
  }
}
