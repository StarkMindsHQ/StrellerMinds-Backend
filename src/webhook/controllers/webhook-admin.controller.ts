import { Controller, Post, Get } from '@nestjs/common';
import type { WebhookDeliveryService } from '../services/webhook-delivery.service';
import type { WebhookEventService } from '../services/webhook-event.service';
// import { AdminGuard } from '../../auth/guards/admin.guard'; // Uncomment if you have admin auth

@Controller('admin/webhooks')
// @UseGuards(AdminGuard) // Uncomment if you have admin auth
export class WebhookAdminController {
  constructor(
    private readonly webhookDeliveryService: WebhookDeliveryService,
    private readonly webhookEventService: WebhookEventService,
  ) {}

  @Post('process-retries')
  async processRetries() {
    await this.webhookDeliveryService.processRetries();
    return { message: 'Webhook retries processed' };
  }

  @Post('test-event')
  async testEvent() {
    await this.webhookEventService.emitCustomEvent('test', {
      message: 'This is a test event',
      timestamp: new Date().toISOString(),
    });
    return { message: 'Test event emitted' };
  }

  @Get('stats')
  async getGlobalStats() {
    // Implement global webhook statistics
    return { message: 'Global stats endpoint - implement as needed' };
  }
}
