import { Injectable, Logger } from "@nestjs/common"
import type { Repository } from "typeorm"
import type { Queue } from "bull"
import * as webpush from "web-push"

import type { PushSubscription, PushSubscriptionData } from "../entities/push-subscription.entity"
import type { NotificationTemplate, NotificationOptions } from "../entities/notification-template.entity"

export interface CreateSubscriptionDto {
  userId?: string
  subscription: PushSubscriptionData
  userAgent?: string
  deviceType?: string
  preferences?: any
  metadata?: any
}

export interface SendNotificationDto {
  subscriptionIds?: string[]
  userIds?: string[]
  templateType?: string
  title?: string
  body?: string
  options?: Partial<NotificationOptions>
  variables?: Record<string, any>
  scheduleAt?: Date
}

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name)

  private readonly subscriptionRepository: Repository<PushSubscription>
  private readonly templateRepository: Repository<NotificationTemplate>
  private readonly notificationQueue: Queue

  constructor(
    subscriptionRepository: Repository<PushSubscription>,
    templateRepository: Repository<NotificationTemplate>,
    notificationQueue: Queue,
  ) {
    this.subscriptionRepository = subscriptionRepository
    this.templateRepository = templateRepository
    this.notificationQueue = notificationQueue
    this.initializeWebPush()
  }

  private initializeWebPush() {
    const vapidKeys = {
      publicKey: process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY,
    }

    if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
      this.logger.warn("VAPID keys not configured. Push notifications will not work.")
      return
    }

    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:admin@example.com",
      vapidKeys.publicKey,
      vapidKeys.privateKey,
    )
  }

  async createSubscription(dto: CreateSubscriptionDto): Promise<PushSubscription> {
    try {
      // Check if subscription already exists
      const existing = await this.subscriptionRepository.findOne({
        where: { endpoint: dto.subscription.endpoint },
      })

      if (existing) {
        // Update existing subscription
        existing.userId = dto.userId || existing.userId
        existing.p256dhKey = dto.subscription.keys.p256dh
        existing.authKey = dto.subscription.keys.auth
        existing.userAgent = dto.userAgent || existing.userAgent
        existing.deviceType = dto.deviceType || existing.deviceType
        existing.preferences = dto.preferences || existing.preferences
        existing.metadata = dto.metadata || existing.metadata
        existing.isActive = true
        existing.failureCount = 0

        return await this.subscriptionRepository.save(existing)
      }

      // Create new subscription
      const subscription = this.subscriptionRepository.create({
        userId: dto.userId,
        endpoint: dto.subscription.endpoint,
        p256dhKey: dto.subscription.keys.p256dh,
        authKey: dto.subscription.keys.auth,
        userAgent: dto.userAgent,
        deviceType: dto.deviceType,
        preferences: dto.preferences,
        metadata: dto.metadata,
        isActive: true,
      })

      const saved = await this.subscriptionRepository.save(subscription)
      this.logger.log(`Created push subscription: ${saved.id}`)

      return saved
    } catch (error) {
      this.logger.error(`Failed to create subscription: ${error.message}`, error.stack)
      throw error
    }
  }

  async updateSubscription(
    id: string,
    updates: Partial<Pick<PushSubscription, "preferences" | "isActive" | "metadata">>,
  ): Promise<PushSubscription> {
    const subscription = await this.subscriptionRepository.findOne({ where: { id } })
    if (!subscription) {
      throw new Error("Subscription not found")
    }

    Object.assign(subscription, updates)
    return await this.subscriptionRepository.save(subscription)
  }

  async deleteSubscription(id: string): Promise<void> {
    await this.subscriptionRepository.update(id, { isActive: false })
    this.logger.log(`Deactivated push subscription: ${id}`)
  }

  async sendNotification(dto: SendNotificationDto): Promise<{ queued: number; errors: string[] }> {
    try {
      let subscriptions: PushSubscription[] = []

      if (dto.subscriptionIds?.length) {
        subscriptions = await this.subscriptionRepository.find({
          where: {
            id: { $in: dto.subscriptionIds } as any,
            isActive: true,
          },
        })
      } else if (dto.userIds?.length) {
        subscriptions = await this.subscriptionRepository.find({
          where: {
            userId: { $in: dto.userIds } as any,
            isActive: true,
          },
        })
      } else {
        // Send to all active subscriptions (be careful with this!)
        subscriptions = await this.subscriptionRepository.find({
          where: { isActive: true },
          take: 1000, // Limit to prevent overwhelming
        })
      }

      if (subscriptions.length === 0) {
        return { queued: 0, errors: ["No active subscriptions found"] }
      }

      // Get notification template if specified
      let template: NotificationTemplate | null = null
      if (dto.templateType) {
        template = await this.templateRepository.findOne({
          where: { type: dto.templateType, isActive: true },
        })
      }

      // Prepare notification options
      let notificationOptions: NotificationOptions

      if (template) {
        notificationOptions = template.render(dto.variables || {})
      } else {
        notificationOptions = {
          title: dto.title || "Notification",
          body: dto.body || "",
          ...dto.options,
        }
      }

      // Queue notifications
      const jobs = subscriptions.map((subscription) => ({
        name: "send-push-notification",
        data: {
          subscriptionId: subscription.id,
          subscription: subscription.getSubscriptionData(),
          notification: notificationOptions,
        },
        opts: {
          delay: dto.scheduleAt ? dto.scheduleAt.getTime() - Date.now() : 0,
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 2000,
          },
        },
      }))

      await this.notificationQueue.addBulk(jobs)

      this.logger.log(`Queued ${jobs.length} push notifications`)

      return { queued: jobs.length, errors: [] }
    } catch (error) {
      this.logger.error(`Failed to send notifications: ${error.message}`, error.stack)
      return { queued: 0, errors: [error.message] }
    }
  }

  async sendToSubscription(subscription: PushSubscriptionData, notification: NotificationOptions): Promise<boolean> {
    try {
      const payload = JSON.stringify(notification)
      await webpush.sendNotification(subscription, payload)
      return true
    } catch (error) {
      this.logger.error(`Failed to send push notification: ${error.message}`)
      return false
    }
  }

  async getSubscriptions(filters: {
    userId?: string
    isActive?: boolean
    deviceType?: string
    limit?: number
    offset?: number
  }): Promise<{ subscriptions: PushSubscription[]; total: number }> {
    const query = this.subscriptionRepository.createQueryBuilder("subscription")

    if (filters.userId) {
      query.andWhere("subscription.userId = :userId", { userId: filters.userId })
    }

    if (filters.isActive !== undefined) {
      query.andWhere("subscription.isActive = :isActive", { isActive: filters.isActive })
    }

    if (filters.deviceType) {
      query.andWhere("subscription.deviceType = :deviceType", { deviceType: filters.deviceType })
    }

    query.orderBy("subscription.createdAt", "DESC")

    if (filters.limit) {
      query.limit(filters.limit)
    }

    if (filters.offset) {
      query.offset(filters.offset)
    }

    const [subscriptions, total] = await query.getManyAndCount()

    return { subscriptions, total }
  }

  async getSubscriptionStats(): Promise<{
    total: number
    active: number
    byDeviceType: Record<string, number>
    byUserAgent: Record<string, number>
  }> {
    const [total, active] = await Promise.all([
      this.subscriptionRepository.count(),
      this.subscriptionRepository.count({ where: { isActive: true } }),
    ])

    const deviceTypeStats = await this.subscriptionRepository
      .createQueryBuilder("subscription")
      .select("subscription.deviceType", "deviceType")
      .addSelect("COUNT(*)", "count")
      .where("subscription.isActive = :isActive", { isActive: true })
      .groupBy("subscription.deviceType")
      .getRawMany()

    const userAgentStats = await this.subscriptionRepository
      .createQueryBuilder("subscription")
      .select("subscription.userAgent", "userAgent")
      .addSelect("COUNT(*)", "count")
      .where("subscription.isActive = :isActive", { isActive: true })
      .groupBy("subscription.userAgent")
      .getRawMany()

    const byDeviceType = deviceTypeStats.reduce((acc, stat) => {
      acc[stat.deviceType || "unknown"] = Number.parseInt(stat.count)
      return acc
    }, {})

    const byUserAgent = userAgentStats.reduce((acc, stat) => {
      acc[stat.userAgent || "unknown"] = Number.parseInt(stat.count)
      return acc
    }, {})

    return {
      total,
      active,
      byDeviceType,
      byUserAgent,
    }
  }
}
