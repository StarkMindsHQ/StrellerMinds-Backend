import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { PushNotificationService } from '../services/push-notification.service';
import { NotificationAnalyticsService } from '../services/notification-analytics.service';
import { BulkNotificationService, BulkNotificationJob } from '../services/bulk-notification.service';
import { NotificationRetryService } from '../services/notification-retry.service';
import { DeviceManagementService } from '../services/device-management.service';

@ApiTags('admin/notifications')
@Controller('admin/notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@ApiBearerAuth()
export class NotificationAdminController {
  constructor(
    private readonly notificationService: PushNotificationService,
    private readonly analyticsService: NotificationAnalyticsService,
    private readonly bulkService: BulkNotificationService,
    private readonly retryService: NotificationRetryService,
    private readonly deviceService: DeviceManagementService
  ) {}

  @Get('analytics')
  @ApiOperation({ summary: 'Get notification analytics' })
  async getAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('userId') userId?: string
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    
    return await this.analyticsService.getNotificationStats(start, end, userId);
  }

  @Get('analytics/failures')
  @ApiOperation({ summary: 'Get top failure reasons' })
  async getFailureReasons(@Query('limit') limit: number = 10) {
    return await this.analyticsService.getTopFailureReasons(limit);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Send bulk notification' })
  async sendBulkNotification(@Body() job: BulkNotificationJob) {
    await this.bulkService.sendBulkNotification(job);
    return { message: 'Bulk notification job started' };
  }

  @Get('retry/stats')
  @ApiOperation({ summary: 'Get retry statistics' })
  async getRetryStats() {
    return await this.retryService.getRetryStats();
  }

  @Post('retry/:id')
  @ApiOperation({ summary: 'Manually retry notification' })
  async manualRetry(@Param('id') id: string) {
    const notification = await this.notificationService.getNotificationById(id);
    if (notification) {
      await this.notificationService.processNotification(notification);
      return { message: 'Retry initiated' };
    }
    return { message: 'Notification not found' };
  }

  @Get('devices/stats')
  @ApiOperation({ summary: 'Get device statistics' })
  async getDeviceStats() {
    return await this.deviceService.getDeviceStats();
  }

  @Delete('devices/cleanup')
  @ApiOperation({ summary: 'Cleanup stale devices' })
  async cleanupDevices() {
    await this.deviceService.cleanupStaleDevices();
    return { message: 'Device cleanup completed' };
  }

  @Get('scheduled')
  @ApiOperation({ summary: 'Get scheduled notifications' })
  async getScheduledNotifications() {
    return await this.notificationService.getScheduledNotifications();
  }
}