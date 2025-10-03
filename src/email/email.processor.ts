import { Process, Processor, OnQueueFailed, InjectQueue } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bull';
import { EmailService, EmailOptions } from './email.service';

@Processor('email')
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    private readonly emailService: EmailService,
    @InjectQueue('email-dlq') private readonly dlqQueue: Queue,
  ) {}

  @Process('send')
  async handleSendEmail(job: Job<EmailOptions>) {
    this.logger.debug(`Processing email job ${job.id}`);
    try {
      await this.emailService.sendImmediate(job.data);
      this.logger.debug(`Email job ${job.id} completed successfully`);
    } catch (error) {
      this.logger.error(
        `Failed to process email job ${job.id}: ${error.message}`,
        error.stack,
      );
      throw error; // Rethrow to trigger Bull's retry mechanism
    }
  }

  @OnQueueFailed()
  async handleFailedJob(job: Job<EmailOptions>, error: Error) {
    this.logger.error(
      `Job ${job.id} failed after ${job.attemptsMade} attempts: ${error.message}`,
    );

    // If job has exhausted all retries, move to DLQ
    if (job.attemptsMade >= job.opts.attempts) {
      await this.dlqQueue.add('failed-email', {
        originalJobId: job.id,
        data: job.data,
        error: error.message,
        failedAt: new Date(),
        attempts: job.attemptsMade,
      });
      this.logger.warn(`Job ${job.id} moved to dead-letter queue`);
    }
  }
}
