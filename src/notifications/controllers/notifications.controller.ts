import { Controller, Post, Get, Put, Delete, Body, Param, Query, HttpStatus, HttpCode } from '@nestjs/common';
import { ApiTags, ApiResponse, ApiOperation } from '@nestjs/swagger';
import { EmailNotificationsService } from '../services/email-notifications.service';
import { TemplateService } from '../services/template.service';
import { NotificationPreferenceService } from '../services/notification-preference.service';
import { EmailAnalyticsService } from '../services/email-analytics.service';
import { SendEmailDto } from '../dto/send-email.dto';
import { CreateEmailTemplateDto } from '../dto/create-email-template.dto';
import { UpdateEmailTemplateDto } from '../dto/update-email-template.dto';
import { CreateNotificationPreferenceDto, UpdateNotificationPreferenceDto, UnsubscribeDto } from '../dto/notification-preference.dto';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly emailNotificationsService: EmailNotificationsService,
    private readonly templateService: TemplateService,
    private readonly notificationPreferenceService: NotificationPreferenceService,
    private readonly emailAnalyticsService: EmailAnalyticsService,
  ) {}

  @Post('email/send')
  @ApiOperation({ summary: 'Send an email notification' })
  @ApiResponse({ status: 201, description: 'Email sent successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async sendEmail(@Body() sendEmailDto: SendEmailDto) {
    const result = await this.emailNotificationsService.sendEmail(sendEmailDto);
    return { success: true, data: result };
  }

  @Post('email/templates')
  @ApiOperation({ summary: 'Create a new email template' })
  @ApiResponse({ status: 201, description: 'Template created successfully' })
  async createTemplate(@Body() createTemplateDto: CreateEmailTemplateDto) {
    const template = await this.templateService.createTemplate(createTemplateDto);
    return { success: true, data: template };
  }

  @Put('email/templates/:id')
  @ApiOperation({ summary: 'Update an email template' })
  @ApiResponse({ status: 200, description: 'Template updated successfully' })
  async updateTemplate(@Param('id') id: string, @Body() updateTemplateDto: UpdateEmailTemplateDto) {
    const template = await this.templateService.updateTemplate(id, updateTemplateDto);
    return { success: true, data: template };
  }

  @Get('email/templates/:id')
  @ApiOperation({ summary: 'Get an email template by ID' })
  @ApiResponse({ status: 200, description: 'Template retrieved successfully' })
  async getTemplate(@Param('id') id: string) {
    const template = await this.templateService.getTemplateById(id);
    return { success: true, data: template };
  }

  @Get('email/templates/type/:type')
  @ApiOperation({ summary: 'Get an email template by type' })
  @ApiResponse({ status: 200, description: 'Template retrieved successfully' })
  async getTemplateByType(@Param('type') type: string) {
    const template = await this.templateService.getTemplateByType(type);
    return { success: true, data: template };
  }

  @Post('preferences')
  @ApiOperation({ summary: 'Create notification preferences for a user' })
  @ApiResponse({ status: 201, description: 'Preferences created successfully' })
  async createPreferences(@Body() createPrefDto: CreateNotificationPreferenceDto) {
    const preferences = await this.notificationPreferenceService.createPreferences(createPrefDto);
    return { success: true, data: preferences };
  }

  @Get('preferences/:userId')
  @ApiOperation({ summary: 'Get notification preferences for a user' })
  @ApiResponse({ status: 200, description: 'Preferences retrieved successfully' })
  async getPreferences(@Param('userId') userId: string) {
    const preferences = await this.notificationPreferenceService.getPreferences(userId);
    return { success: true, data: preferences };
  }

  @Put('preferences/:userId')
  @ApiOperation({ summary: 'Update notification preferences for a user' })
  @ApiResponse({ status: 200, description: 'Preferences updated successfully' })
  async updatePreferences(@Param('userId') userId: string, @Body() updatePrefDto: UpdateNotificationPreferenceDto) {
    const preferences = await this.notificationPreferenceService.updatePreferences(userId, updatePrefDto);
    return { success: true, data: preferences };
  }

  @Post('unsubscribe')
  @ApiOperation({ summary: 'Unsubscribe using token' })
  @ApiResponse({ status: 200, description: 'Successfully unsubscribed' })
  @HttpCode(HttpStatus.OK)
  async unsubscribe(@Body() unsubscribeDto: UnsubscribeDto) {
    await this.notificationPreferenceService.unsubscribeByToken(
      unsubscribeDto.token, 
      unsubscribeDto.categories
    );
    return { success: true, message: 'Successfully unsubscribed' };
  }

  @Get('analytics/:emailQueueId')
  @ApiOperation({ summary: 'Get analytics for an email' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  async getEmailAnalytics(@Param('emailQueueId') emailQueueId: string) {
    const analytics = await this.emailAnalyticsService.getAnalyticsForEmail(emailQueueId);
    return { success: true, data: analytics };
  }

  @Get('analytics/user/:userId')
  @ApiOperation({ summary: 'Get analytics for a user' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  async getUserAnalytics(@Param('userId') userId: string) {
    const analytics = await this.emailAnalyticsService.getAnalyticsForUser(userId);
    return { success: true, data: analytics };
  }

  @Get('analytics/overall')
  @ApiOperation({ summary: 'Get overall analytics' })
  @ApiResponse({ status: 200, description: 'Overall analytics retrieved successfully' })
  async getOverallAnalytics() {
    const analytics = await this.emailAnalyticsService.getOverallAnalytics();
    return { success: true, data: analytics };
  }
}