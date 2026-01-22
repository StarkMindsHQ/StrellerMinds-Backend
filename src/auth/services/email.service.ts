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
      subject: 'StrellerMinds Security Alert',
      template: 'security-alert',
      context: {
        firstName: user.firstName,
        alert,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
