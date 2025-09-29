import { Injectable, Logger } from "@nestjs/common"
import type { Repository } from "typeorm"
import type { UserCourseInteraction } from "../../users/entities/user-course-interaction.entity"
import type { Course } from "../../courses/entities/course.entity"
import type { User } from "../../users/entities/user.entity"
import type { RealtimeDashboardData } from "../interfaces/analytics.interface"
import type { Cache } from "cache-manager"
import { Inject } from "@nestjs/common"
import { CACHE_MANAGER } from "@nestjs/cache-manager"
import { MoreThanOrEqual } from "typeorm"

@Injectable()
export class RealtimeAnalyticsService {
  private readonly logger = new Logger(RealtimeAnalyticsService.name)
  private readonly REALTIME_CACHE_TTL = 10; // seconds

  constructor(
    private readonly userInteractionRepository: Repository<UserCourseInteraction>,
    private readonly courseRepository: Repository<Course>,
    private readonly userRepository: Repository<User>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getRealtimeDashboardData(): Promise<RealtimeDashboardData> {
    const cacheKey = "realtime_dashboard_data"
    const cachedData = await this.cacheManager.get<RealtimeDashboardData>(cacheKey)
    if (cachedData) {
      return cachedData
    }

    const now = new Date()
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000) // Last 5 minutes

    // Active users (simplified: users with recent interactions)
    const activeInteractions = await this.userInteractionRepository.find({
      where: {
        updatedAt: MoreThanOrEqual(fiveMinutesAgo),
      },
      relations: ["user", "course"],
    })
    const activeUsersNow = new Set(activeInteractions.map((i) => i.userId)).size

    // Courses being viewed
    const coursesBeingViewedMap = new Map<string, { courseId: string; title: string; viewers: number }>()
    activeInteractions.forEach((interaction) => {
      if (interaction.course) {
        const courseEntry = coursesBeingViewedMap.get(interaction.courseId) || {
          courseId: interaction.courseId,
          title: interaction.course.title,
          viewers: 0,
        }
        courseEntry.viewers++
        coursesBeingViewedMap.set(interaction.courseId, courseEntry)
      }
    })
    const coursesBeingViewed = Array.from(coursesBeingViewedMap.values()).sort((a, b) => b.viewers - a.viewers)

    // Recent enrollments (last 5 minutes)
    const recentEnrollments = await this.userInteractionRepository.find({
      where: {
        createdAt: MoreThanOrEqual(fiveMinutesAgo),
        progress: 0, // Assuming new enrollment starts at 0 progress
      },
      relations: ["user", "course"],
      order: { createdAt: "DESC" },
      take: 10,
    })
    const formattedRecentEnrollments = recentEnrollments.map((i) => ({
      userId: i.userId,
      courseId: i.courseId,
      timestamp: i.createdAt,
      userName: i.user?.username || "N/A",
      courseTitle: i.course?.title || "N/A",
    }))

    // Recent completions (last 5 minutes)
    const recentCompletions = await this.userInteractionRepository.find({
      where: {
        updatedAt: MoreThanOrEqual(fiveMinutesAgo),
        completed: true,
      },
      relations: ["user", "course"],
      order: { updatedAt: "DESC" },
      take: 10,
    })
    const formattedRecentCompletions = recentCompletions.map((i) => ({
      userId: i.userId,
      courseId: i.courseId,
      timestamp: i.updatedAt,
      userName: i.user?.username || "N/A",
      courseTitle: i.course?.title || "N/A",
    }))

    // Overall activity rate (simplified: total interactions in last minute)
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000)
    const recentInteractionsCount = await this.userInteractionRepository.count({
      where: {
        updatedAt: MoreThanOrEqual(oneMinuteAgo),
      },
    })
    const overallActivityRate = recentInteractionsCount / 60 // Interactions per second

    const data: RealtimeDashboardData = {
      activeUsersNow,
      coursesBeingViewed,
      recentEnrollments: formattedRecentEnrollments,
      recentCompletions: formattedRecentCompletions,
      overallActivityRate,
    }

    await this.cacheManager.set(cacheKey, data, this.REALTIME_CACHE_TTL)
    return data
  }
}
