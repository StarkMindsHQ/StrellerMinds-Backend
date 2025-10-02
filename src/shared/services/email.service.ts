import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Service for sending emails to users.
 * Integrate with a real email provider in production (e.g., SendGrid, Mailgun, AWS SES).
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  /**
   * Constructs the EmailService.
   * @param configService - The configuration service for accessing environment variables.
   */
  constructor(private readonly configService: ConfigService) {}

  /**
   * Send an email to a user.
   * @param to Recipient email address
   * @param subject Email subject
   * @param htmlBody Email HTML body
   * @throws Error if sending fails
   */
  async sendEmail(to: string, subject: string, htmlBody: string): Promise<void> {
    try {
      // In a production environment, you would integrate with a real email
      // service provider like SendGrid, Mailgun, AWS SES, etc.

      // For now, we'll just log the email content
      this.logger.log(`Email would be sent to: ${to}`);
      this.logger.log(`Subject: ${subject}`);
      this.logger.debug(`Body: ${htmlBody}`);

      // Simulating email sending delay
      await new Promise((resolve) => setTimeout(resolve, 100));

      return;
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}`, error.stack);
      throw new Error(`Email sending failed: ${error.message}`);
    }
  }
}
