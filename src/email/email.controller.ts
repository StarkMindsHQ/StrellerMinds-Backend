import { Controller, Get, Post, Body, Param, Query, Res } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailPreference } from './entities/email-preference.entity';

@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('preferences')
  async updatePreference(
    @Body() body: { email: string; emailType: string; optOut: boolean },
  ): Promise<EmailPreference> {
    return this.emailService.updateEmailPreference(
      body.email,
      body.emailType,
      body.optOut,
    );
  }

  @Get('analytics')
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

  // This endpoint would be used for tracking email opens
  // It would typically return a 1x1 transparent pixel
  @Get('track/open/:id')
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
