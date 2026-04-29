import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  template?: string;
  context?: Record<string, unknown>;
  text?: string;
  html?: string;
}

export interface EmailResult {
  messageId: string;
  accepted: string[];
  rejected: string[];
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly mailerService: MailerService) {}

  async sendEmail(options: SendEmailOptions): Promise<EmailResult> {
    try {
      const result = await this.mailerService.sendMail({
        to: options.to,
        subject: options.subject,
        template: options.template,
        context: options.context,
        text: options.text,
        html: options.html,
      });

      this.logger.log(`Email sent successfully to ${options.to}`);

      return {
        messageId: result.messageId,
        accepted: result.accepted ?? [],
        rejected: result.rejected ?? [],
      };
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}`, error);
      throw error;
    }
  }

  async sendWelcomeEmail(to: string, firstName: string): Promise<EmailResult> {
    return this.sendEmail({
      to,
      subject: 'Welcome to StrellerMinds!',
      template: 'welcome',
      context: { firstName },
    });
  }

  async sendPasswordResetEmail(to: string, resetToken: string, resetUrl: string): Promise<EmailResult> {
    return this.sendEmail({
      to,
      subject: 'Reset Your Password',
      template: 'password-reset',
      context: { resetToken, resetUrl },
    });
  }

  async sendCourseEnrollmentEmail(
    to: string,
    firstName: string,
    courseName: string,
  ): Promise<EmailResult> {
    return this.sendEmail({
      to,
      subject: `You're enrolled in ${courseName}`,
      template: 'course-enrollment',
      context: { firstName, courseName },
    });
  }

  async sendCertificateEmail(
    to: string,
    firstName: string,
    courseName: string,
    certificateUrl: string,
  ): Promise<EmailResult> {
    return this.sendEmail({
      to,
      subject: `Your Certificate for ${courseName}`,
      template: 'certificate',
      context: { firstName, courseName, certificateUrl },
    });
  }

  async sendNotificationEmail(
    to: string,
    subject: string,
    message: string,
  ): Promise<EmailResult> {
    return this.sendEmail({
      to,
      subject,
      html: `<p>${message}</p>`,
      text: message,
    });
  }
}