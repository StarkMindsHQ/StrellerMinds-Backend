import { Controller, Get, Post, Patch, Param, Delete, Query, HttpStatus, HttpCode } from "@nestjs/common"
import type { WebhookService } from "../services/webhook.service"
import type { WebhookDeliveryService } from "../services/webhook-delivery.service"
import type { CreateWebhookDto } from "../dto/create-webhook.dto"
import type { UpdateWebhookDto } from "../dto/update-webhook.dto"
// import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'; // Uncomment if you have auth

@Controller("webhooks")
// @UseGuards(JwtAuthGuard) // Uncomment if you have auth
export class WebhookController {
  constructor(
    private readonly webhookService: WebhookService,
    private readonly webhookDeliveryService: WebhookDeliveryService,
  ) {}

  @Post()
  async create(createWebhookDto: CreateWebhookDto) {
    return this.webhookService.create(createWebhookDto)
  }

  @Get()
  async findAll() {
    return this.webhookService.findAll()
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.webhookService.findOne(id);
  }

  @Patch(":id")
  async update(@Param('id') id: string, updateWebhookDto: UpdateWebhookDto) {
    return this.webhookService.update(id, updateWebhookDto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    return this.webhookService.remove(id);
  }

  @Post(':id/test')
  async testWebhook(@Param('id') id: string) {
    const success = await this.webhookService.testWebhook(id);
    return { success, message: success ? 'Test webhook sent' : 'Test webhook failed' };
  }

  @Get(':id/stats')
  async getStats(@Param('id') id: string) {
    return this.webhookService.getWebhookStats(id);
  }

  @Get(":id/deliveries")
  async getDeliveries(@Param('id') id: string, @Query('limit') limit?: number) {
    return this.webhookDeliveryService.getDeliveries(id, limit)
  }
}
