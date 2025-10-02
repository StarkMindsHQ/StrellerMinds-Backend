import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { EmailService, EmailOptions } from './email.service';

@Processor('email')
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly emailService: EmailService) {}

  @Process('send')
  async handleSendEmail(job: Job<EmailOptions>) {
    this.logger.debug(`Processing email job ${job.id}`);
    try {
      await this.emailService.sendImmediate(job.data);
      this.logger.debug(`Email job ${job.id} completed successfully`);
    } catch (error) {
      this.logger.error(`Failed to process email job ${job.id}: ${error.message}`, error.stack);
      throw error; // Rethrow to trigger Bull's retry mechanism
    }
  }
}
