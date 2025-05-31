import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  Put,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import type { CreateNotificationDto } from './dto/create-notification.dto';
import type { CreateNotificationFromTemplateDto } from './dto/create-notification-from-template.dto';
import type { UpdateNotificationDto } from './dto/update-notification.dto';
import type { NotificationPreferenceDto } from './dto/notification-preference.dto';
import type { QueryNotificationsDto } from './dto/query-notifications.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { User } from '../users/entities/user.entity';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { InAppService } from './providers/in-app.service';
import { PreferenceService } from './providers/preferences.service';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,

    private readonly inAppService: InAppService,

    private readonly prefService: PreferenceService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new notification' })
  @ApiResponse({
    status: 201,
    description: 'Notification created successfully',
  })
  create(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationsService.create(createNotificationDto);
  }

  @Post('from-template')
  @ApiOperation({ summary: 'Create a notification from template' })
  @ApiResponse({
    status: 201,
    description: 'Notification created successfully',
  })
  createFromTemplate(@Body() dto: CreateNotificationFromTemplateDto) {
    return this.notificationsService.createFromTemplate(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all notifications for current user' })
  @ApiResponse({ status: 200, description: 'Return all notifications' })
  findAll(@CurrentUser() user: User, @Query() query: QueryNotificationsDto) {
    return this.notificationsService.findAllForUser(user.id, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count for current user' })
  @ApiResponse({ status: 200, description: 'Return unread count' })
  getUnreadCount(@CurrentUser() user: User) {
    return this.notificationsService.getUnreadCount(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a notification by ID' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({ status: 200, description: 'Return the notification' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.notificationsService.findOne(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a notification' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({
    status: 200,
    description: 'Notification updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  update(
    @Param('id') id: string,
    @Body() updateNotificationDto: UpdateNotificationDto,
    @CurrentUser() user: User,
  ) {
    return this.notificationsService.update(id, updateNotificationDto, user.id);
  }

  @Patch('mark-all-as-read')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'Notifications marked as read' })
  @HttpCode(HttpStatus.OK)
  markAllAsRead(@CurrentUser() user: User) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({
    status: 204,
    description: 'Notification deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.notificationsService.remove(id, user.id);
  }

  // Notification Preferences
  @Get('preferences')
  @ApiOperation({ summary: 'Get notification preferences for current user' })
  @ApiResponse({ status: 200, description: 'Return notification preferences' })
  getPreferences(@CurrentUser() user: User) {
    return this.notificationsService.getPreferences(user.id);
  }

  @Post('preferences')
  @ApiOperation({ summary: 'Update notification preferences' })
  @ApiResponse({ status: 200, description: 'Preferences updated successfully' })
  updatePreferences(
    @Body() preferences: NotificationPreferenceDto[],
    @CurrentUser() user: User,
  ) {
    return this.notificationsService.updatePreferences(user.id, preferences);
  }

  @Get('preferences/me')
  async getMyPreferences(@Req() req) {
    return this.prefService.getOrCreate(req.user.id);
  }

  @Put('preferences/me')
async updateMyPreferences(
  @Req() req,
  @Body() body: UpdatePreferencesDto,
) {
  return this.prefService.updatePreferences(req.user.id, body);
}


  @Get('user/:userId')
  async getUserNotifications(@Param('userId') userId: string) {
    return this.inAppService.getUserNotifications(userId);
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') notificationId: string) {
    await this.inAppService.markAsRead(notificationId);
    return { success: true };
  }
}
