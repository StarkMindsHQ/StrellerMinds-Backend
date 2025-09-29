import { Injectable, Logger } from "@nestjs/common"
import type { Repository } from "typeorm"
import { type WebhookDelivery, DeliveryStatus } from "../entities/webhook-delivery.entity"
import { Webhook } from "../entities/webhook.entity"
import type { WebhookEventDto } from "../dto/webhook-event.dto"
import type { HttpService } from "@nestjs/axios"
import { firstValueFrom } from "rxjs"
import * as crypto from "crypto"
import { getRepository } from "typeorm"

@Injectable()
export class WebhookDeliveryService {
  private readonly logger = new Logger(WebhookDeliveryService.name)

  constructor(
    private deliveryRepository: Repository<WebhookDelivery>,
    private httpService: HttpService,
  ) {}

  async createDelivery(webhook: Webhook, eventDto: WebhookEventDto): Promise<WebhookDelivery> {
    const delivery = this.deliveryRepository.create({
      webhookId: webhook.id,
      event: eventDto.event,
      payload: {
        event: eventDto.event,
        data: eventDto.data,
        entityId: eventDto.entityId,
        entityType: eventDto.entityType,
        metadata: eventDto.metadata,
        timestamp: new Date().toISOString(),
      },
      status: DeliveryStatus.PENDING,
    })

    const savedDelivery = await this.deliveryRepository.save(delivery)

    // Trigger immediate delivery attempt
    this.deliverWebhook(savedDelivery, webhook).catch((error) => {
      this.logger.error(`Failed to deliver webhook ${savedDelivery.id}:`, error)
    })

    return savedDelivery
  }

  async deliverWebhook(delivery: WebhookDelivery, webhook?: Webhook): Promise<void> {
    if (!webhook) {
      webhook = await this.getWebhookForDelivery(delivery.webhookId)
    }

    if (!webhook) {
      this.logger.error(`Webhook not found for delivery ${delivery.id}`)
      return
    }

    try {
      delivery.attempts += 1
      delivery.status = DeliveryStatus.RETRYING
      await this.deliveryRepository.save(delivery)

      const headers = {
        "Content-Type": "application/json",
        "User-Agent": "Webhook-Service/1.0",
        "X-Webhook-Event": delivery.event,
        "X-Webhook-Delivery": delivery.id,
        ...webhook.headers,
      }

      // Add signature if secret is provided
      if (webhook.secret) {
        const signature = this.generateSignature(delivery.payload, webhook.secret)
        headers["X-Webhook-Signature"] = signature
      }

      const response = await firstValueFrom(
        this.httpService.post(webhook.url, delivery.payload, {
          headers,
          timeout: webhook.timeoutSeconds * 1000,
        }),
      )

      // Success
      delivery.status = DeliveryStatus.SUCCESS
      delivery.responseStatus = response.status
      delivery.responseBody = JSON.stringify(response.data)
      delivery.responseHeaders = response.headers
      delivery.deliveredAt = new Date()
      delivery.errorMessage = null

      this.logger.log(`Webhook delivered successfully: ${delivery.id}`)
    } catch (error) {
      // Failure
      delivery.status = DeliveryStatus.FAILED
      delivery.responseStatus = error.response?.status || null
      delivery.responseBody = error.response?.data ? JSON.stringify(error.response.data) : null
      delivery.responseHeaders = error.response?.headers || null
      delivery.errorMessage = error.message

      // Schedule retry if attempts < maxRetries
      if (delivery.attempts < webhook.maxRetries) {
        delivery.status = DeliveryStatus.PENDING
        delivery.nextRetryAt = this.calculateNextRetry(delivery.attempts)
        this.logger.warn(`Webhook delivery failed, scheduling retry: ${delivery.id}`)
      } else {
        this.logger.error(`Webhook delivery failed permanently: ${delivery.id}`)
      }
    }

    await this.deliveryRepository.save(delivery)
  }

  async processRetries(): Promise<void> {
    const pendingDeliveries = await this.deliveryRepository.find({
      where: {
        status: DeliveryStatus.PENDING,
        nextRetryAt: new Date(),
      },
      take: 100, // Process in batches
    })

    this.logger.log(`Processing ${pendingDeliveries.length} webhook retries`)

    for (const delivery of pendingDeliveries) {
      await this.deliverWebhook(delivery)
    }
  }

  async getDeliveryStats(webhookId: string) {
    const [total, successful, failed, pending] = await Promise.all([
      this.deliveryRepository.count({ where: { webhookId } }),
      this.deliveryRepository.count({ where: { webhookId, status: DeliveryStatus.SUCCESS } }),
      this.deliveryRepository.count({ where: { webhookId, status: DeliveryStatus.FAILED } }),
      this.deliveryRepository.count({ where: { webhookId, status: DeliveryStatus.PENDING } }),
    ])

    return {
      total,
      successful,
      failed,
      pending,
      successRate: total > 0 ? (successful / total) * 100 : 0,
    }
  }

  async getDeliveries(webhookId: string, limit = 50) {
    return this.deliveryRepository.find({
      where: { webhookId },
      order: { createdAt: "DESC" },
      take: limit,
    })
  }

  private async getWebhookForDelivery(webhookId: string): Promise<Webhook | null> {
    // This would typically use the webhook service, but to avoid circular dependency
    // we'll implement a simple query here

    try {
      const webhookRepo = getRepository(Webhook)
      return await webhookRepo.findOne({ where: { id: webhookId } })
    } catch {
      return null
    }
  }

  private generateSignature(payload: any, secret: string): string {
    const payloadString = JSON.stringify(payload)
    return `sha256=${crypto.createHmac("sha256", secret).update(payloadString).digest("hex")}`
  }

  private calculateNextRetry(attempts: number): Date {
    // Exponential backoff: 2^attempts minutes
    const delayMinutes = Math.pow(2, attempts)
    const delay = Math.min(delayMinutes * 60 * 1000, 60 * 60 * 1000) // Max 1 hour
    return new Date(Date.now() + delay)
  }
}
