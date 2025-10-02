import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Query,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import type {
  PushNotificationService,
  CreateSubscriptionDto,
  SendNotificationDto,
} from '../services/push-notification.service';

@ApiTags('Push Notifications')
@Controller('pwa/push')
export class PushNotificationController {
  constructor(private readonly pushNotificationService: PushNotificationService) {}

  @Post('subscribe')
  @ApiOperation({ summary: 'Create or update push notification subscription' })
  @ApiResponse({ status: 201, description: 'Subscription created successfully' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async subscribe(dto: CreateSubscriptionDto) {
    const subscription = await this.pushNotificationService.createSubscription(dto);
    return {
      success: true,
      data: subscription,
      message: 'Push subscription created successfully',
    };
  }

  @Put('subscription/:id')
  @ApiOperation({ summary: 'Update push notification subscription preferences' })
  @ApiResponse({ status: 200, description: 'Subscription updated successfully' })
  async updateSubscription(
    @Param('id') id: string,
    updates: { preferences?: any; isActive?: boolean; metadata?: any },
  ) {
    const subscription = await this.pushNotificationService.updateSubscription(id, updates);
    return {
      success: true,
      data: subscription,
      message: 'Subscription updated successfully',
    };
  }

  @Delete('subscription/:id')
  @ApiOperation({ summary: 'Delete push notification subscription' })
  @ApiResponse({ status: 200, description: 'Subscription deleted successfully' })
  async unsubscribe(@Param('id') id: string) {
    await this.pushNotificationService.deleteSubscription(id);
    return {
      success: true,
      message: 'Push subscription deleted successfully',
    };
  }

  @Post('send')
  @ApiOperation({ summary: 'Send push notification' })
  @ApiResponse({ status: 200, description: 'Notification sent successfully' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async sendNotification(dto: SendNotificationDto) {
    const result = await this.pushNotificationService.sendNotification(dto);
    return {
      success: result.queued > 0,
      data: result,
      message: `${result.queued} notifications queued for delivery`,
    };
  }

  @Get('subscriptions')
  @ApiOperation({ summary: 'Get push notification subscriptions' })
  @ApiResponse({ status: 200, description: 'Subscriptions retrieved successfully' })
  async getSubscriptions(
    @Query('userId') userId?: string,
    @Query('isActive') isActive?: boolean,
    @Query('deviceType') deviceType?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const filters = {
      userId,
      isActive: isActive !== undefined ? isActive === true : undefined,
      deviceType,
      limit: limit ? Number.parseInt(limit.toString()) : undefined,
      offset: offset ? Number.parseInt(offset.toString()) : undefined,
    };

    const result = await this.pushNotificationService.getSubscriptions(filters);
    return {
      success: true,
      data: result,
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get push notification statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStats() {
    const stats = await this.pushNotificationService.getSubscriptionStats();
    return {
      success: true,
      data: stats,
    };
  }

  @Get('vapid-public-key')
  @ApiOperation({ summary: 'Get VAPID public key for client-side subscription' })
  @ApiResponse({ status: 200, description: 'VAPID public key retrieved successfully' })
  async getVapidPublicKey() {
    return {
      success: true,
      data: {
        publicKey: process.env.VAPID_PUBLIC_KEY,
      },
    };
  }
}
