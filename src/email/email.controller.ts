/**
 * EmailController handles endpoints for managing email preferences, analytics, and tracking.
 */
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Res,
  Req,
  ForbiddenException,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { EmailService } from './email.service';
import { EmailPreference } from './entities/email-preference.entity';
import { Response, Request } from 'express';
import { EmailTrackingUtil } from './utils/tracking.util';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Email')
@Controller('email')
export class EmailController {
  private readonly logger = new Logger(EmailController.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly trackingUtil: EmailTrackingUtil,
  ) {}
  /**
   * Track email open via transparent pixel
   */
  @Get('track/open/:token.png')
  @ApiOperation({ summary: 'Track email open via pixel' })
  @ApiParam({ name: 'token', description: 'Email tracking token' })
  async trackOpen(
    @Param('token') token: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const metadata = {
        userAgent: req.headers['user-agent']?.toString().substring(0, 255),
        ipAddress: this.getClientIp(req),
      };

      await this.emailService.markEmailAsOpened(token, metadata);

      const pixel = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        'base64',
      );

      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Length': pixel.length,
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        Pragma: 'no-cache',
        Expires: '0',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'no-referrer',
      });
      res.end(pixel);
    } catch (error) {
      this.logger.error(`Error tracking email open: ${error.message}`);
      const pixel = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        'base64',
      );
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Length': pixel.length,
      });
      res.end(pixel);
    }
  }

  /**
   * Track email click and redirect
   */
  @Get('track/click/:token')
  @ApiOperation({ summary: 'Track email click and redirect' })
  @ApiParam({ name: 'token', description: 'Email tracking token' })
  @ApiQuery({ name: 'url', description: 'Target URL (encoded)' })
  @ApiQuery({ name: 'sig', description: 'HMAC signature' })
  async trackClick(
    @Param('token') token: string,
    @Query('url') encodedUrl: string,
    @Query('sig') signature: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const targetUrl = decodeURIComponent(encodedUrl);

      const isValid = this.trackingUtil.verifySignature(token, targetUrl, signature);
      if (!isValid) {
        this.logger.warn(`Invalid tracking signature for token: ${token}`);
        throw new ForbiddenException('Invalid tracking signature');
      }

      const metadata = {
        userAgent: req.headers['user-agent']?.toString().substring(0, 255),
        ipAddress: this.getClientIp(req),
      };

      await this.emailService.markEmailAsClicked(token, targetUrl, metadata);

      res.redirect(302, targetUrl);
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(`Error tracking email click: ${error.message}`);
      res.redirect(302, '/');
    }
  }

  /**
   * Get email analytics (protected)
   */
  @Get('track/analytics/:emailId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get email tracking analytics' })
  @ApiParam({ name: 'emailId', description: 'Email log ID' })
  async getEmailLogAnalytics(@Param('emailId') emailId: string) {
    return this.emailService.getEmailLogAnalytics(emailId);
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return (req.socket as any)?.remoteAddress || 'unknown';
  }

  /**
   * Update a user's email preference for a specific email type.
   * @param body - Email, emailType, and optOut flag
   * @returns The updated EmailPreference entity
   */
  @Post('preferences')
  @ApiOperation({
    summary: 'Update email preference',
    description: "Update a user's email preference for a specific email type.",
  })
  @ApiBody({
    schema: {
      properties: {
        email: { type: 'string' },
        emailType: { type: 'string' },
        optOut: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Email preference updated', type: EmailPreference })
  async updatePreference(
    @Body() body: { email: string; emailType: string; optOut: boolean },
  ): Promise<EmailPreference> {
    return this.emailService.updateEmailPreference(body.email, body.emailType, body.optOut);
  }

  /**
   * Get email analytics for a date range and optional template name.
   * @param startDate - Start date (ISO8601)
   * @param endDate - End date (ISO8601)
   * @param templateName - Optional template name
   * @returns Analytics data
   */
  @Get('analytics')
  @ApiOperation({
    summary: 'Get email analytics',
    description: 'Get email analytics for a date range and optional template name.',
  })
  @ApiQuery({ name: 'startDate', required: true, description: 'Start date (ISO8601)' })
  @ApiQuery({ name: 'endDate', required: true, description: 'End date (ISO8601)' })
  @ApiQuery({ name: 'templateName', required: false, description: 'Template name' })
  @ApiResponse({ status: 200, description: 'Email analytics data' })
  async getAnalyticsByRange(
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
  @ApiOperation({
    summary: 'Track email open',
    description: 'Track email open event (returns a 1x1 transparent pixel).',
  })
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
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
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
  async trackClick(@Param('id') id: string, @Query('url') url: string, @Res() res) {
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
