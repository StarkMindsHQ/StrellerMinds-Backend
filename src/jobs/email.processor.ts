import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';

export const EMAIL_QUEUE = 'email';

export interface SendEmailJobData {
  to: string;
  subject: string;
  body: string;
}

@Processor(EMAIL_QUEUE)
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  @Process('send')
  async handleSendEmail(job: Job<SendEmailJobData>): Promise<void> {
    const { to, subject } = job.data;
    this.logger.log(`Processing email job ${job.id}: sending to ${to} — "${subject}"`);
    // Actual email sending delegated to the mailer service in production
  }
}
