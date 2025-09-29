import { Injectable, Logger } from "@nestjs/common"
import { type Repository, Between } from "typeorm"
import {
  type Notification,
  NotificationChannel,
  NotificationStatus,
  NotificationType,
} from "../entities/notification.entity"
import type { NotificationAnalytics } from "../entities/notification-analytics.entity"
import { Cron, CronExpression } from "@nestjs/schedule"
import type { NotificationAnalyticsQueryDto } from "../dto/analytics-query.dto"

@Injectable()
export class NotificationAnalyticsService {
  private readonly logger = new Logger(NotificationAnalyticsService.name)

  constructor(
    private readonly notificationRepository: Repository<Notification>,
    private readonly analyticsRepository: Repository<NotificationAnalytics>,
  ) {}

  async trackNotificationEvent(notificationId: string, status: NotificationStatus): Promise<void> {
    try {
      const notification = await this.notificationRepository.findOne({ where: { id: notificationId } })
      if (!notification) {
        this.logger.warn(`Notification with ID ${notificationId} not found for tracking event.`)
        return
      }

      // Update notification status
      if (status === NotificationStatus.READ && !notification.readAt) {
        notification.readAt = new Date()
      }
      if (status === NotificationStatus.CLICKED && !notification.clickedAt) {
        notification.clickedAt = new Date()
      }
      notification.status = status // Update to the latest status
      await this.notificationRepository.save(notification)

      this.logger.debug(`Tracked event "${status}" for notification ${notificationId}`)
    } catch (error) {
      this.logger.error(`Failed to track notification event for ${notificationId}: ${error.message}`, error.stack)
    }
  }

  async getAnalytics(query: NotificationAnalyticsQueryDto): Promise<NotificationAnalytics[]> {
    const where: any = {}
    if (query.notificationType) where.notificationType = query.notificationType
    if (query.channel) where.channel = query.channel
    if (query.startDate && query.endDate) {
      where.date = Between(new Date(query.startDate), new Date(query.endDate))
    } else if (query.startDate) {
      where.date = Between(new Date(query.startDate), new Date())
    } else if (query.endDate) {
      where.date = Between(new Date(0), new Date(query.endDate))
    }

    return this.analyticsRepository.find({ where, order: { date: "ASC" } })
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM) // Run daily to aggregate previous day's data
  async aggregateDailyNotificationAnalytics() {
    this.logger.log("Starting daily notification analytics aggregation...")
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)
    const today = new Date(yesterday)
    today.setDate(yesterday.getDate() + 1) // End of yesterday

    try {
      const notificationTypes = Object.values(NotificationType)
      const channels = Object.values(NotificationChannel)

      for (const type of notificationTypes) {
        for (const channel of channels) {
          const sentCount = await this.notificationRepository.count({
            where: {
              type,
              channels: [channel], // Check if this channel was targeted
              sentAt: Between(yesterday, today),
              status: NotificationStatus.SENT,
            },
          })

          const readCount = await this.notificationRepository.count({
            where: {
              type,
              channels: [channel],
              readAt: Between(yesterday, today),
              status: NotificationStatus.READ,
            },
          })

          const clickedCount = await this.notificationRepository.count({
            where: {
              type,
              channels: [channel],
              clickedAt: Between(yesterday, today),
              status: NotificationStatus.CLICKED,
            },
          })

          // Find or create analytics record for the day
          let analytics = await this.analyticsRepository.findOne({
            where: { notificationType: type, channel, date: yesterday },
          })

          if (!analytics) {
            analytics = this.analyticsRepository.create({
              notificationType: type,
              channel,
              date: yesterday,
            })
          }

          analytics.sentCount = sentCount
          analytics.readCount = readCount
          analytics.clickedCount = clickedCount
          analytics.openedCount = readCount // For simplicity, opened is same as read for now

          // Calculate delivery success rate (requires tracking FAILED status more granularly)
          // For now, assume all sent are successful unless explicitly marked failed
          analytics.deliverySuccessRate = sentCount > 0 ? 1.0 : 0.0

          await this.analyticsRepository.save(analytics)
        }
      }
      this.logger.log("Daily notification analytics aggregation completed.")
    } catch (error) {
      this.logger.error("Error during daily notification analytics aggregation:", error.stack)
    }
  }
}
