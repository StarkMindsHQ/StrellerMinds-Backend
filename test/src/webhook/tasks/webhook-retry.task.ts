import { Injectable, Logger } from "@nestjs/common"
import { Cron, CronExpression } from "@nestjs/schedule"
import type { WebhookDeliveryService } from "../services/webhook-delivery.service"

@Injectable()
export class WebhookRetryTask {
  private readonly logger = new Logger(WebhookRetryTask.name)

  constructor(private webhookDeliveryService: WebhookDeliveryService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleWebhookRetries() {
    this.logger.debug("Processing webhook retries...")
    try {
      await this.webhookDeliveryService.processRetries()
    } catch (error) {
      this.logger.error("Error processing webhook retries:", error)
    }
  }
}
