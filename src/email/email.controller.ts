/**
 * EmailController handles endpoints for managing email preferences, analytics, and tracking.
 */
import { Controller, Get, Post, Body, Param, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { EmailService } from './email.service';
import { EmailPreference } from './entities/email-preference.entity';

@ApiTags('Email')
@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  /**
   * Update a user's email preference for a specific email type.
   * @param body - Email, emailType, and optOut flag
   * @returns The updated EmailPreference entity
   */
  @Post('preferences')
  @ApiOperation({ summary: 'Update email preference', description: 'Update a user\'s email preference for a specific email type.' })
  @ApiBody({ schema: { properties: { email: { type: 'string' }, emailType: { type: 'string' }, optOut: { type: 'boolean' } } } })
  @ApiResponse({ status: 200, description: 'Email preference updated', type: EmailPreference })
  async updatePreference(
    @Body() body: { email: string; emailType: string; optOut: boolean },
  ): Promise<EmailPreference> {
    return this.emailService.updateEmailPreference(
      body.email,
      body.emailType,
      body.optOut,
    );
  }

  /**
   * Get email analytics for a date range and optional template name.
   * @param startDate - Start date (ISO8601)
   * @param endDate - End date (ISO8601)
   * @param templateName - Optional template name
   * @returns Analytics data
   */
  @Get('analytics')
  @ApiOperation({ summary: 'Get email analytics', description: 'Get email analytics for a date range and optional template name.' })
  @ApiQuery({ name: 'startDate', required: true, description: 'Start date (ISO8601)' })
  @ApiQuery({ name: 'endDate', required: true, description: 'End date (ISO8601)' })
  @ApiQuery({ name: 'templateName', required: false, description: 'Template name' })
  @ApiResponse({ status: 200, description: 'Email analytics data' })
  async getAnalytics(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('templateName') templateName?: string,
  ) {
    return this.emailService.getEmailAnalytics(
      new Date(startDate),
      new Date(endDate),
      templateName,
    );
  }

  /**
   * Track email open event (returns a 1x1 transparent pixel).
   * @param id - Email log ID
   * @param res - Response object
   */
  @Get('track/open/:id')
  @ApiOperation({ summary: 'Track email open', description: 'Track email open event (returns a 1x1 transparent pixel).' })
  @ApiParam({ name: 'id', description: 'Email log ID' })
  @ApiResponse({ status: 200, description: '1x1 transparent pixel returned' })
  async trackOpen(@Param('id') id: string, @Res() res) {
    try {
      // Update the email log to mark as opened
      await this.emailService.markEmailAsOpened(id);

      // Return a 1x1 transparent pixel
      const buffer = Buffer.from(
        'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        'base64',
      );

      res.set('Content-Type', 'image/gif');
      res.set(
        'Cache-Control',
        'no-store, no-cache, must-revalidate, proxy-revalidate',
      );
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      return res.send(buffer);
    } catch (error) {
      // Still return the pixel even if tracking fails
      const buffer = Buffer.from(
        'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        'base64',
      );

      res.set('Content-Type', 'image/gif');
      return res.send(buffer);
    }
  }

  // This endpoint would be used for tracking email clicks
  @Get('track/click/:id')
  async trackClick(
    @Param('id') id: string,
    @Query('url') url: string,
    @Res() res,
  ) {
    try {
      // Update the email log to mark as clicked
      await this.emailService.markEmailAsClicked(id, url);
    } catch (error) {
      // Log the error but continue with the redirect
      console.error('Error tracking click:', error);
    }

    // Redirect to the original URL
    return res.redirect(url);
  }
}
