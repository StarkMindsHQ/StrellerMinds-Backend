import { Processor, Process } from "@nestjs/bull"
import { Logger } from "@nestjs/common"
import type { Job } from "bull"

import type { PushNotificationService } from "../services/push-notification.service"

@Processor("push-notifications")
export class PushNotificationProcessor {
  private readonly logger = new Logger(PushNotificationProcessor.name)

  constructor(private readonly pushNotificationService: PushNotificationService) {}

  @Process("send-push-notification")
  async handleSendPushNotification(
    job: Job<{
      subscriptionId: string
      subscription: any
      notification: any
    }>,
  ) {
    const { subscriptionId, subscription, notification } = job.data

    try {
      this.logger.log(`Sending push notification to subscription: ${subscriptionId}`)

      const success = await this.pushNotificationService.sendToSubscription(subscription, notification)

      if (success) {
        this.logger.log(`Push notification sent successfully to: ${subscriptionId}`)

        // Update subscription stats
        await this.updateSubscriptionStats(subscriptionId, true)
      } else {
        this.logger.error(`Failed to send push notification to: ${subscriptionId}`)
        await this.updateSubscriptionStats(subscriptionId, false)
        throw new Error("Failed to send push notification")
      }
    } catch (error) {
      this.logger.error(`Error processing push notification job: ${error.message}`, error.stack)
      await this.updateSubscriptionStats(subscriptionId, false)
      throw error
    }
  }

  private async updateSubscriptionStats(subscriptionId: string, success: boolean) {
    try {
      // This would typically update the subscription record with stats
      // For now, we'll just log the outcome
      this.logger.log(`Updated stats for subscription ${subscriptionId}: ${success ? "success" : "failure"}`)
    } catch (error) {
      this.logger.error(`Failed to update subscription stats: ${error.message}`)
    }
  }
}
