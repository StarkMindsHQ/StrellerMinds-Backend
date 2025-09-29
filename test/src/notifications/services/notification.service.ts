import { Injectable, Logger } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { type Repository, Between, In } from "typeorm"
import { Notification, NotificationChannel, NotificationStatus } from "../entities/notification.entity"
import { User } from "../../users/entities/user.entity"
import type { CreateNotificationDto } from "../dto/create-notification.dto"
import type { NotificationQueryDto } from "../dto/notification-query.dto"
import type { EmailService } from "./email.service"
import type { SmsService } from "./sms.service"
import type { PushNotificationService } from "./push-notification.service"
import type { NotificationPreferenceService } from "./notification-preference.service"
import type { NotificationAnalyticsService } from "./notification-analytics.service"
import type { EventEmitter2 } from "@nestjs/event-emitter"

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
    private readonly pushNotificationService: PushNotificationService,
    private readonly preferenceService: NotificationPreferenceService,
    private readonly analyticsService: NotificationAnalyticsService,
    private readonly eventEmitter: EventEmitter2, // For real-time in-app notifications
  ) {}

  async sendNotification(dto: CreateNotificationDto): Promise<Notification> {
    const { userId, type, message, title, data, channels: requestedChannels } = dto

    const user = await this.userRepository.findOne({ where: { id: userId } })
    if (!user) {
      this.logger.error(`User with ID ${userId} not found. Cannot send notification.`)
      throw new Error("User not found")
    }

    // Determine target channels based on requested channels and user preferences
    let targetChannels: NotificationChannel[] = []
    if (requestedChannels && requestedChannels.length > 0) {
      // If specific channels are requested, use them
      targetChannels = requestedChannels
    } else {
      // Otherwise, use user's preferred channels for this notification type
      targetChannels = await this.preferenceService.getPreferredChannelsForType(userId, type)
    }

    if (targetChannels.length === 0) {
      this.logger.warn(`No active channels for user ${userId} and notification type ${type}. Skipping notification.`)
      const notification = this.notificationRepository.create({
        userId,
        type,
        message,
        title,
        data,
        channels: [],
        status: NotificationStatus.FAILED, // Mark as failed if no channels
        sentAt: new Date(),
      })
      return this.notificationRepository.save(notification)
    }

    const notification = this.notificationRepository.create({
      userId,
      type,
      message,
      title,
      data,
      channels: targetChannels,
      status: NotificationStatus.PENDING,
    })
    const savedNotification = await this.notificationRepository.save(notification)

    // Asynchronously send notifications via enabled channels
    this.processNotificationChannels(savedNotification, user)
      .then(() => this.logger.log(`Notification ${savedNotification.id} processed.`))
      .catch((error) => this.logger.error(`Error processing notification ${savedNotification.id}: ${error.message}`))

    return savedNotification
  }

  private async processNotificationChannels(notification: Notification, user: User): Promise<void> {
    let overallSuccess = false
    const sentChannels: NotificationChannel[] = []

    for (const channel of notification.channels) {
      let channelSuccess = false
      try {
        switch (channel) {
          case NotificationChannel.EMAIL:
            if (user.email) {
              channelSuccess = await this.emailService.sendEmail(
                user.email,
                notification.title || "Notification",
                notification.message,
              )
            } else {
              this.logger.warn(`User ${user.id} has no email for email notification.`)
            }
            break
          case NotificationChannel.SMS:
            if (user.phoneNumber) {
              channelSuccess = await this.smsService.sendSms(user.phoneNumber, notification.message)
            } else {
              this.logger.warn(`User ${user.id} has no phone number for SMS notification.`)
            }
            break
          case NotificationChannel.PUSH:
            // Assuming user has a device token stored somewhere (e.g., in User entity or a separate table)
            if (user.deviceToken) {
              channelSuccess = await this.pushNotificationService.sendPushNotification(
                user.deviceToken,
                notification.title || "Notification",
                notification.message,
                notification.data,
              )
            } else {
              this.logger.warn(`User ${user.id} has no device token for push notification.`)
            }
            break
          case NotificationChannel.IN_APP:
            // Emit event for WebSocket gateway to pick up
            this.eventEmitter.emit("notification.new", {
              userId: notification.userId,
              notification: notification,
            })
            channelSuccess = true // In-app is considered "sent" if event is emitted
            break
          default:
            this.logger.warn(`Unsupported notification channel: ${channel}`)
            break
        }

        if (channelSuccess) {
          sentChannels.push(channel)
          overallSuccess = true
        }
      } catch (error) {
        this.logger.error(`Failed to send notification ${notification.id} via ${channel}: ${error.message}`)
      }
    }

    // Update notification status based on overall success
    notification.status = overallSuccess ? NotificationStatus.SENT : NotificationStatus.FAILED
    notification.sentAt = new Date()
    await this.notificationRepository.save(notification)

    // Track analytics for each channel that was attempted
    for (const channel of notification.channels) {
      await this.analyticsService.trackNotificationEvent(
        notification.id,
        sentChannels.includes(channel) ? NotificationStatus.SENT : NotificationStatus.FAILED,
      )
    }
  }

  async getNotificationHistory(userId: string, query: NotificationQueryDto): Promise<Notification[]> {
    const { type, status, startDate, endDate, page = 1, limit = 20 } = query
    const where: any = { userId }

    if (type) where.type = type
    if (status) where.status = status
    if (startDate && endDate) {
      where.createdAt = Between(new Date(startDate), new Date(endDate))
    } else if (startDate) {
      where.createdAt = Between(new Date(startDate), new Date())
    } else if (endDate) {
      where.createdAt = Between(new Date(0), new Date(endDate))
    }

    return this.notificationRepository.find({
      where,
      order: { createdAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    })
  }

  async markNotificationAsRead(notificationId: string, userId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId },
    })

    if (!notification) {
      throw new Error("Notification not found or unauthorized.")
    }

    if (notification.status !== NotificationStatus.READ) {
      notification.readAt = new Date()
      notification.status = NotificationStatus.READ
      const updatedNotification = await this.notificationRepository.save(notification)
      await this.analyticsService.trackNotificationEvent(notificationId, NotificationStatus.READ)
      this.eventEmitter.emit("notification.read", { userId, notificationId }) // Notify real-time clients
      return updatedNotification
    }
    return notification
  }

  async markNotificationAsClicked(notificationId: string, userId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId },
    })

    if (!notification) {
      throw new Error("Notification not found or unauthorized.")
    }

    if (notification.status !== NotificationStatus.CLICKED) {
      notification.clickedAt = new Date()
      notification.status = NotificationStatus.CLICKED
      const updatedNotification = await this.notificationRepository.save(notification)
      await this.analyticsService.trackNotificationEvent(notificationId, NotificationStatus.CLICKED)
      this.eventEmitter.emit("notification.clicked", { userId, notificationId }) // Notify real-time clients
      return updatedNotification
    }
    return notification
  }

  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    const result = await this.notificationRepository.delete({ id: notificationId, userId })
    if (result.affected === 0) {
      throw new Error("Notification not found or unauthorized.")
    }
    this.logger.log(`Notification ${notificationId} deleted by user ${userId}`)
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    return this.notificationRepository.count({
      where: { userId, status: In([NotificationStatus.SENT, NotificationStatus.PENDING]) }, // Assuming PENDING means not yet read/failed
    })
  }
}
