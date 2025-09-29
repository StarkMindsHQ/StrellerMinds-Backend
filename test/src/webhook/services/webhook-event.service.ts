import { Injectable, Logger } from "@nestjs/common"
import type { WebhookService } from "./webhook.service"
import type { WebhookEventDto } from "../dto/webhook-event.dto"
import { WebhookEvent } from "../entities/webhook.entity"

@Injectable()
export class WebhookEventService {
  private readonly logger = new Logger(WebhookEventService.name)

  constructor(private webhookService: WebhookService) {}

  async emitEvent(
    event: string,
    data: any,
    options?: {
      entityId?: string
      entityType?: string
      metadata?: Record<string, any>
    },
  ): Promise<void> {
    const eventDto: WebhookEventDto = {
      event,
      data,
      entityId: options?.entityId,
      entityType: options?.entityType,
      metadata: options?.metadata,
    }

    this.logger.debug(`Emitting webhook event: ${event}`)
    await this.webhookService.triggerEvent(eventDto)
  }

  // Convenience methods for common events
  async emitUserCreated(userId: string, userData: any): Promise<void> {
    await this.emitEvent(WebhookEvent.USER_CREATED, userData, {
      entityId: userId,
      entityType: "user",
    })
  }

  async emitUserUpdated(userId: string, userData: any): Promise<void> {
    await this.emitEvent(WebhookEvent.USER_UPDATED, userData, {
      entityId: userId,
      entityType: "user",
    })
  }

  async emitUserDeleted(userId: string): Promise<void> {
    await this.emitEvent(
      WebhookEvent.USER_DELETED,
      { userId },
      {
        entityId: userId,
        entityType: "user",
      },
    )
  }

  async emitOrderCreated(orderId: string, orderData: any): Promise<void> {
    await this.emitEvent(WebhookEvent.ORDER_CREATED, orderData, {
      entityId: orderId,
      entityType: "order",
    })
  }

  async emitOrderUpdated(orderId: string, orderData: any): Promise<void> {
    await this.emitEvent(WebhookEvent.ORDER_UPDATED, orderData, {
      entityId: orderId,
      entityType: "order",
    })
  }

  async emitOrderCompleted(orderId: string, orderData: any): Promise<void> {
    await this.emitEvent(WebhookEvent.ORDER_COMPLETED, orderData, {
      entityId: orderId,
      entityType: "order",
    })
  }

  async emitPaymentProcessed(paymentId: string, paymentData: any): Promise<void> {
    await this.emitEvent(WebhookEvent.PAYMENT_PROCESSED, paymentData, {
      entityId: paymentId,
      entityType: "payment",
    })
  }

  async emitCustomEvent(
    eventName: string,
    data: any,
    options?: {
      entityId?: string
      entityType?: string
      metadata?: Record<string, any>
    },
  ): Promise<void> {
    await this.emitEvent(`custom.${eventName}`, data, options)
  }
}
