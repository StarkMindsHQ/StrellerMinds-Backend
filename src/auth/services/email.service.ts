import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { User } from '../entities/user.entity';

@Injectable()
export class EmailService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  async sendEmailVerification(user: User, token: string): Promise<void> {
    const verificationUrl = `${this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000')}/auth/verify-email?token=${token}`;

    await this.mailerService.sendMail({
      to: user.email,
      subject: 'Verify Your StrellerMinds Email Address',
      template: 'verify-email',
      context: {
        firstName: user.firstName,
        verificationUrl,
      },
    });
  }

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    const resetUrl = `${this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000')}/auth/reset-password?token=${resetToken}`;

    await this.mailerService.sendMail({
      to: email,
      subject: 'Reset Your StrellerMinds Password',
      template: 'reset-password',
      context: {
        resetUrl,
      },
    });
  }

  async sendPasswordReset(user: User, token: string): Promise<void> {
    const resetUrl = `${this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000')}/auth/reset-password?token=${token}`;

    await this.mailerService.sendMail({
      to: user.email,
      subject: 'Reset Your StrellerMinds Password',
      template: 'reset-password',
      context: {
        firstName: user.firstName,
        resetUrl,
      },
    });
  }

  async sendWelcomeEmail(user: User): Promise<void> {
    await this.mailerService.sendMail({
      to: user.email,
      subject: 'Welcome to StrellerMinds!',
      template: 'welcome',
      context: {
        firstName: user.firstName,
        loginUrl: `${this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000')}/auth/login`,
      },
    });
  }

  async sendAccountSuspended(user: User): Promise<void> {
    await this.mailerService.sendMail({
      to: user.email,
      subject: 'Your StrellerMinds Account Has Been Suspended',
      template: 'account-suspended',
      context: {
        firstName: user.firstName,
        supportEmail: 'support@strellerminds.com',
      },
    });
  }

  async sendSecurityAlert(user: User, alert: string): Promise<void> {
    await this.mailerService.sendMail({
      to: user.email,
      subject: 'Security Alert for Your StrellerMinds Account',
      template: 'security-alert',
      context: {
        firstName: user.firstName,
        alert,
      },
    });
  }

  async sendInvoice(email: string, invoice: any, subject: string, message: string): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject: subject || 'Invoice from StrellerMinds',
      template: 'invoice',
      context: {
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.total,
        dueDate: invoice.dueDate,
        customerName: invoice.customerName || email,
        message: message,
      },
    });
  }
}
