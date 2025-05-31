import { Injectable, Logger } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { type Notification, NotificationType } from "./entities/notification.entity"
import { EmailService } from "./providers/email.service"
import { PushNotificationService } from "./providers/push-notification.service"
import { UsersService } from "src/users/services/users.service"

@Injectable()
export class NotificationDeliveryService {
  private readonly logger = new Logger(NotificationDeliveryService.name)

  constructor(
    private readonly usersService: UsersService,
    private readonly emailService: EmailService,
    private readonly pushService: PushNotificationService,
    private readonly configService: ConfigService,
  ) {}

  async deliverNotification(notification: Notification): Promise<void> {
    try {
      const user = await this.usersService.findOne(notification.userId)

      if (!user) {
        this.logger.warn(`User ${notification.userId} not found for notification delivery`)
        return
      }

      const deliveryPromises: Promise<any>[] = []

      // Process each notification type
      if (notification.types.includes(NotificationType.EMAIL)) {
        deliveryPromises.push(this.deliverEmail(notification, user))
      }

      if (notification.types.includes(NotificationType.PUSH)) {
        deliveryPromises.push(this.deliverPushNotification(notification, user))
      }

      if (notification.types.includes(NotificationType.IN_APP)) {
        // In-app notifications are stored in the database and delivered via WebSockets
        // No additional delivery needed here
      }

      // Wait for all delivery methods to complete
      await Promise.all(deliveryPromises)
    } catch (error) {
      this.logger.error(`Failed to deliver notification: ${error.message}`, error.stack)
      throw error
    }
  }

  private async deliverEmail(notification: Notification, user: any): Promise<void> {
    try {
      await this.emailService.sendEmail({
        to: user.email,
        subject: notification.title,
        text: notification.content,
        html: this.formatEmailHtml(notification),
        metadata: notification.metadata,
      })
    } catch (error) {
      this.logger.error(`Failed to send email notification: ${error.message}`)
      throw error
    }
  }

  private async deliverPushNotification(notification: Notification, user: any): Promise<void> {
    try {
      if (!user.pushTokens || user.pushTokens.length === 0) {
        this.logger.warn(`No push tokens found for user ${user.id}`)
        return
      }

      const tokens = user.pushTokens.map((t) => t.token)

      await this.pushService.sendPushNotification({
        tokens,
        title: notification.title,
        body: notification.content,
        data: notification.metadata,
      })
    } catch (error) {
      this.logger.error(`Failed to send push notification: ${error.message}`)
      throw error
    }
  }

  private formatEmailHtml(notification: Notification): string {
    // Simple HTML template for email notifications
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${notification.title}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f5f5f5; padding: 10px; border-radius: 5px; }
            .content { padding: 20px 0; }
            .footer { font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>${notification.title}</h2>
            </div>
            <div class="content">
              ${notification.content}
            </div>
            <div class="footer">
              <p>This is an automated notification. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `
  }
}

