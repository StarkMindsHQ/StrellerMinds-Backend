import { Injectable } from "@nestjs/common"
import type { WebhookEventService } from "../services/webhook-event.service"
import type { WebhookService } from "../services/webhook.service"
import { WebhookEvent } from "../entities/webhook.entity"

@Injectable()
export class WebhookUsageExamples {
  constructor(
    private webhookEventService: WebhookEventService,
    private webhookService: WebhookService,
  ) {}

  // Example 1: Creating a webhook programmatically
  async createExampleWebhook() {
    return this.webhookService.create({
      name: "User Events Webhook",
      url: "https://api.example.com/webhooks/users",
      events: [WebhookEvent.USER_CREATED, WebhookEvent.USER_UPDATED],
      secret: "your-secret-key",
      headers: {
        Authorization: "Bearer your-token",
        "X-Custom-Header": "custom-value",
      },
      maxRetries: 3,
      timeoutSeconds: 30,
      description: "Webhook for user-related events",
    })
  }

  // Example 2: Emitting events in your business logic
  async handleUserRegistration(user: any) {
    // Your user registration logic here...

    // Emit webhook event
    await this.webhookEventService.emitUserCreated(user.id, {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    })
  }

  // Example 3: Emitting custom events
  async handleCustomBusinessEvent(data: any) {
    await this.webhookEventService.emitCustomEvent(
      "business.important_action",
      {
        actionType: "important_action",
        userId: data.userId,
        details: data.details,
        timestamp: new Date().toISOString(),
      },
      {
        entityId: data.entityId,
        entityType: "business_action",
        metadata: {
          source: "business-service",
          version: "1.0",
        },
      },
    )
  }

  // Example 4: Using the webhook event decorator (in your controllers)
  /*
  @Post('users')
  @WebhookEvent('user.created', {
    extractEntityId: (data) => data.id,
    extractEntityType: () => 'user',
    transformData: (data) => ({
      id: data.id,
      email: data.email,
      name: data.name,
    }),
  })
  async createUser(@Body() createUserDto: CreateUserDto) {
    // Your user creation logic
    return this.userService.create(createUserDto);
  }
  */
}
