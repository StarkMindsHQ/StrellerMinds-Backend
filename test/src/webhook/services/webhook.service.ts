import { Injectable, NotFoundException, Logger } from "@nestjs/common"
import type { Repository } from "typeorm"
import { type Webhook, WebhookStatus } from "../entities/webhook.entity"
import type { CreateWebhookDto } from "../dto/create-webhook.dto"
import type { UpdateWebhookDto } from "../dto/update-webhook.dto"
import type { WebhookDeliveryService } from "./webhook-delivery.service"
import type { WebhookEventDto } from "../dto/webhook-event.dto"

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name)

  constructor(
    private webhookRepository: Repository<Webhook>,
    private webhookDeliveryService: WebhookDeliveryService,
  ) {}

  async create(createWebhookDto: CreateWebhookDto): Promise<Webhook> {
    const webhook = this.webhookRepository.create({
      ...createWebhookDto,
      secret: createWebhookDto.secret || this.generateSecret(),
    })

    const savedWebhook = await this.webhookRepository.save(webhook)
    this.logger.log(`Webhook created: ${savedWebhook.id}`)

    return savedWebhook
  }

  async findAll(): Promise<Webhook[]> {
    return this.webhookRepository.find({
      order: { createdAt: "DESC" },
    })
  }

  async findOne(id: string): Promise<Webhook> {
    const webhook = await this.webhookRepository.findOne({
      where: { id },
    })

    if (!webhook) {
      throw new NotFoundException(`Webhook with ID ${id} not found`)
    }

    return webhook
  }

  async update(id: string, updateWebhookDto: UpdateWebhookDto): Promise<Webhook> {
    const webhook = await this.findOne(id)

    Object.assign(webhook, updateWebhookDto)
    const updatedWebhook = await this.webhookRepository.save(webhook)

    this.logger.log(`Webhook updated: ${updatedWebhook.id}`)
    return updatedWebhook
  }

  async remove(id: string): Promise<void> {
    const webhook = await this.findOne(id)
    await this.webhookRepository.remove(webhook)
    this.logger.log(`Webhook deleted: ${id}`)
  }

  async findActiveWebhooksByEvent(event: string): Promise<Webhook[]> {
    return this.webhookRepository
      .createQueryBuilder("webhook")
      .where("webhook.status = :status", { status: WebhookStatus.ACTIVE })
      .andWhere(":event = ANY(webhook.events)", { event })
      .getMany()
  }

  async triggerEvent(eventDto: WebhookEventDto): Promise<void> {
    const webhooks = await this.findActiveWebhooksByEvent(eventDto.event)

    if (webhooks.length === 0) {
      this.logger.debug(`No active webhooks found for event: ${eventDto.event}`)
      return
    }

    this.logger.log(`Triggering ${webhooks.length} webhooks for event: ${eventDto.event}`)

    // Create delivery records for all webhooks
    const deliveryPromises = webhooks.map((webhook) => this.webhookDeliveryService.createDelivery(webhook, eventDto))

    await Promise.all(deliveryPromises)
  }

  async testWebhook(id: string): Promise<boolean> {
    const webhook = await this.findOne(id)

    const testEvent: WebhookEventDto = {
      event: "webhook.test",
      data: {
        message: "This is a test webhook delivery",
        timestamp: new Date().toISOString(),
        webhookId: webhook.id,
      },
    }

    try {
      await this.webhookDeliveryService.createDelivery(webhook, testEvent)
      return true
    } catch (error) {
      this.logger.error(`Test webhook failed for ${id}:`, error)
      return false
    }
  }

  private generateSecret(): string {
    return require("crypto").randomBytes(32).toString("hex")
  }

  async getWebhookStats(id: string) {
    const webhook = await this.findOne(id)

    const stats = await this.webhookDeliveryService.getDeliveryStats(id)

    return {
      webhook,
      stats,
    }
  }
}
