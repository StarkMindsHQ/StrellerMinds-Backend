import { Injectable, Logger } from '@nestjs/common';
import { EmailOptions } from './email.service';

@Injectable()
export class MockEmailService {
  private readonly logger = new Logger(MockEmailService.name);

  async sendEmail(options: EmailOptions): Promise<boolean> {
    this.logger.log(`[MOCK] Would send email to: ${options.to}, subject: ${options.subject}`);
    return true;
  }

  async sendImmediate(options: EmailOptions): Promise<boolean> {
    this.logger.log(`[MOCK] Would immediately send email to: ${options.to}, subject: ${options.subject}`);
    return true;
  }
} 