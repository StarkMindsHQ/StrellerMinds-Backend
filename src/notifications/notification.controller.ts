import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { NotificationService } from './services/notification.service';
import type { NotificationPreferenceService } from './services/notification-preference.service';
import type { NotificationAnalyticsService } from './services/notification-analytics.service';
import type { CreateNotificationDto } from './dto/create-notification.dto';
import type { UpdateNotificationPreferenceDto } from './dto/update-preference.dto';
import type { NotificationQueryDto } from './dto/notification-query.dto';
import type { NotificationAnalyticsQueryDto } from './dto/analytics-query.dto';
import {
  Notification,
  UserNotificationPreference,
  NotificationAnalytics,
} from './entities/notification.entity';

@ApiTags('Notifications')
@Controller('notifications')
@ApiBearerAuth()
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly preferenceService: NotificationPreferenceService,
    private readonly analyticsService: NotificationAnalyticsService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin') // Only admins can send arbitrary notifications
  @ApiOperation({ summary: 'Send a new notification to a user' })
  @ApiResponse({ status: 201, description: 'Notification sent successfully', type: Notification })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async sendNotification(createNotificationDto: CreateNotificationDto): Promise<Notification> {
    return this.notificationService.sendNotification(createNotificationDto);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Get user's notification history" })
  @ApiResponse({
    status: 200,
    description: 'Notification history retrieved successfully',
    type: [Notification],
  })
  async getNotificationHistory(
    @Req() req: Request,
    @Query() query: NotificationQueryDto,
  ): Promise<Notification[]> {
    const userId = req.user['id'];
    return this.notificationService.getNotificationHistory(userId, query);
  }

  @Get('unread-count')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get count of unread notifications for the user' })
  @ApiResponse({ status: 200, description: 'Unread notification count' })
  async getUnreadNotificationCount(@Req() req: Request): Promise<{ count: number }> {
    const userId = req.user['id'];
    const count = await this.notificationService.getUnreadNotificationCount(userId);
    return { count };
  }

  @Patch(':id/read')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read', type: Notification })
  @ApiResponse({ status: 404, description: 'Notification not found or unauthorized' })
  async markNotificationAsRead(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<Notification> {
    const userId = req.user['id'];
    return this.notificationService.markNotificationAsRead(id, userId);
  }

  @Patch(':id/clicked')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a notification as clicked' })
  @ApiResponse({ status: 200, description: 'Notification marked as clicked', type: Notification })
  @ApiResponse({ status: 404, description: 'Notification not found or unauthorized' })
  async markNotificationAsClicked(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<Notification> {
    const userId = req.user['id'];
    return this.notificationService.markNotificationAsClicked(id, userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a notification from history' })
  @ApiResponse({ status: 204, description: 'Notification deleted successfully' })
  @ApiResponse({ status: 404, description: 'Notification not found or unauthorized' })
  async deleteNotification(@Param('id') id: string, @Req() req: Request): Promise<void> {
    const userId = req.user['id'];
    await this.notificationService.deleteNotification(id, userId);
  }

  @Get('preferences')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Get user's notification preferences" })
  @ApiResponse({
    status: 200,
    description: 'User preferences retrieved',
    type: UserNotificationPreference,
  })
  async getPreferences(@Req() req: Request): Promise<UserNotificationPreference> {
    const userId = req.user['id'];
    return this.preferenceService.getPreferences(userId);
  }

  @Patch('preferences')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Update user's notification preferences" })
  @ApiResponse({
    status: 200,
    description: 'User preferences updated',
    type: UserNotificationPreference,
  })
  async updatePreferences(
    @Req() req: Request,
    updatePreferenceDto: UpdateNotificationPreferenceDto,
  ): Promise<UserNotificationPreference> {
    const userId = req.user['id'];
    return this.preferenceService.updatePreferences(userId, updatePreferenceDto);
  }

  @Get('analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin') // Only admins can view notification analytics
  @ApiOperation({ summary: 'Get notification system analytics' })
  @ApiResponse({
    status: 200,
    description: 'Notification analytics retrieved',
    type: [NotificationAnalytics],
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getNotificationAnalytics(
    @Query() query: NotificationAnalyticsQueryDto,
  ): Promise<NotificationAnalytics[]> {
    return this.analyticsService.getAnalytics(query);
  }
}
