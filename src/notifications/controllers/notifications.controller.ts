import { Controller, Post, Get, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PushNotificationService } from '../services/push-notification.service';
import { CreateNotificationDto, NotificationPlatform } from '../dto/create-notification.dto';
import { NotificationPreferencesDto } from '../dto/notification-preferences.dto';
import { NotificationType } from '../entities/notification.entity';
import { User } from '../../auth/decorators/user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationService: PushNotificationService) {}

  @Post()
  @ApiOperation({ summary: 'Send a notification' })
  @ApiResponse({ status: 201, description: 'Notification sent successfully' })
  async sendNotification(@Body() dto: CreateNotificationDto) {
    return await this.notificationService.sendNotification(dto);
  }

  @Post('templated')
  @ApiOperation({ summary: 'Send a templated notification' })
  async sendTemplatedNotification(
    @Body() body: {
      type: NotificationType;
      templateData: any;
      userId?: string;
      topic?: string;
      platform?: NotificationPlatform;
    }
  ) {
    const { type, templateData, userId, topic, platform } = body;
    return await this.notificationService.sendTemplatedNotification(
      type,
      templateData,
      userId,
      topic,
      platform
    );
  }

  @Post('device-token')
  @ApiOperation({ summary: 'Register device token' })
  async registerDeviceToken(
    @User('id') userId: string,
    @Body() body: {
      token: string;
      platform: NotificationPlatform;
      deviceId?: string;
      appVersion?: string;
    }
  ) {
    const { token, platform, deviceId, appVersion } = body;
    return await this.notificationService.registerDeviceToken(
      userId,
      token,
      platform,
      deviceId,
      appVersion
    );
  }

  @Post('device-token/unregister')
  @ApiOperation({ summary: 'Unregister device token' })
  async unregisterDeviceToken(
    @User('id') userId: string,
    @Body() body: { token: string }
  ) {
    await this.notificationService.unregisterDeviceToken(userId, body.token);
    return { message: 'Device token unregistered successfully' };
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get user notification preferences' })
  async getUserPreferences(@User('id') userId: string) {
    return await this.notificationService.getUserPreferences(userId);
  }

  @Put('preferences')
  @ApiOperation({ summary: 'Update user notification preferences' })
  async updateUserPreferences(
    @User('id') userId: string,
    @Body() preferences: NotificationPreferencesDto
  ) {
    return await this.notificationService.updateUserPreferences(userId, preferences);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get user notification history' })
  async getUserNotifications(
    @User('id') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20
  ) {
    return await this.notificationService.getUserNotifications(userId, page, limit);
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get available notification templates' })
  async getAvailableTemplates() {
    return {
      types: Object.values(NotificationType),
      platforms: Object.values(NotificationPlatform)
    };
  }
}

