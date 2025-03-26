import { Controller, Get, Post, Body, Request } from '@nestjs/common';
import type { EmailService } from './email.service';
import type { EmailType } from './entities/email-preference.entity';

@Controller('email-preferences')
export class EmailPreferenceController {
  constructor(private readonly emailService: EmailService) {}

  @Get()
  async getUserPreferences(@Request() req) {
    const preferences = await this.emailService.getUserPreferences(
      req.user.email,
    );
    return preferences;
  }

  @Post()
  async updatePreferences(
    @Request() req,
    @Body() body: { preferences: { emailType: EmailType; optOut: boolean }[] },
  ) {
    const results = [];

    for (const pref of body.preferences) {
      const result = await this.emailService.updateEmailPreference(
        req.user.email,
        pref.emailType,
        pref.optOut,
      );
      results.push(result);
    }

    return results;
  }

  // Public endpoint for unsubscribe links in emails
  @Post('unsubscribe')
  async unsubscribe(
    @Body() body: { email: string; token: string; emailType: EmailType },
  ) {
    // Verify the unsubscribe token first (security measure)
    const isValid = await this.emailService.verifyUnsubscribeToken(
      body.email,
      body.token,
    );

    if (!isValid) {
      return { success: false, message: 'Invalid unsubscribe token' };
    }

    await this.emailService.updateEmailPreference(
      body.email,
      body.emailType,
      true, // opt out
    );

    return { success: true, message: 'Successfully unsubscribed' };
  }
}
