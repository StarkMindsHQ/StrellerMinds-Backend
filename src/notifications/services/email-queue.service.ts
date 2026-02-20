import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailQueue, EmailStatus } from '../entities/email-queue.entity';
import { SendEmailDto } from '../dto/send-email.dto';
import { EmailTemplate } from '../entities/email-template.entity';
import { EmailService } from '../../auth/services/email.service';

@Injectable()
export class EmailQueueService {
  private readonly logger = new Logger(EmailQueueService.name);

  constructor(
    @InjectRepository(EmailQueue)
    private emailQueueRepository: Repository<EmailQueue>,
    @InjectRepository(EmailTemplate)
    private emailTemplateRepository: Repository<EmailTemplate>,
    private emailService: EmailService,
  ) {}

  async addToQueue(sendEmailDto: SendEmailDto): Promise<EmailQueue> {
    const emailQueue = new EmailQueue();

    // Set basic email properties
    emailQueue.recipientEmail = sendEmailDto.to;
    emailQueue.recipientName = sendEmailDto.name;
    emailQueue.templateType = sendEmailDto.templateType;
    emailQueue.subject = sendEmailDto.subject;
    emailQueue.htmlContent = sendEmailDto.htmlContent;
    emailQueue.textContent = sendEmailDto.textContent;
    emailQueue.templateData = sendEmailDto.templateData;
    emailQueue.scheduledAt = sendEmailDto.scheduleAt;

    // If templateId is provided, load the template
    if (sendEmailDto.templateId) {
      const template = await this.emailTemplateRepository.findOne({
        where: { id: sendEmailDto.templateId },
      });

      if (template) {
        emailQueue.subject = this.replacePlaceholders(template.subject, sendEmailDto.templateData);
        emailQueue.htmlContent = this.replacePlaceholders(
          template.htmlContent,
          sendEmailDto.templateData,
        );
        emailQueue.textContent = template.textContent
          ? this.replacePlaceholders(template.textContent, sendEmailDto.templateData)
          : undefined;
      }
    }

    // If templateType is provided, load the template by type
    if (sendEmailDto.templateType && !sendEmailDto.templateId) {
      const template = await this.emailTemplateRepository.findOne({
        where: { type: sendEmailDto.templateType, isActive: true },
      });

      if (template) {
        emailQueue.subject = this.replacePlaceholders(template.subject, sendEmailDto.templateData);
        emailQueue.htmlContent = this.replacePlaceholders(
          template.htmlContent,
          sendEmailDto.templateData,
        );
        emailQueue.textContent = template.textContent
          ? this.replacePlaceholders(template.textContent, sendEmailDto.templateData)
          : undefined;
      }
    }

    // Apply language-specific template if needed
    if (sendEmailDto.language && sendEmailDto.templateId) {
      const template = await this.emailTemplateRepository.findOne({
        where: { id: sendEmailDto.templateId },
      });

      if (template && template.languages && template.languages[sendEmailDto.language]) {
        const langTemplate = template.languages[sendEmailDto.language];
        emailQueue.subject = this.replacePlaceholders(
          langTemplate.subject,
          sendEmailDto.templateData,
        );
        emailQueue.htmlContent = this.replacePlaceholders(
          langTemplate.htmlContent,
          sendEmailDto.templateData,
        );
        emailQueue.textContent = langTemplate.textContent
          ? this.replacePlaceholders(langTemplate.textContent, sendEmailDto.templateData)
          : undefined;
      }
    }

    // Set initial status
    emailQueue.status = EmailStatus.PENDING;

    return await this.emailQueueRepository.save(emailQueue);
  }

  private replacePlaceholders(text: string, data: Record<string, any>): string {
    if (!data) return text;

    let result = text;
    for (const [key, value] of Object.entries(data)) {
      const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(placeholder, String(value || ''));
    }
    return result;
  }

  async processEmail(jobId: string): Promise<boolean> {
    try {
      const emailJob = await this.emailQueueRepository.findOne({
        where: { id: jobId },
      });

      if (!emailJob) {
        this.logger.error(`Email job with ID ${jobId} not found`);
        return false;
      }

      // Update status to processing
      emailJob.status = EmailStatus.PROCESSING;
      await this.emailQueueRepository.save(emailJob);

      // Send the email
      const emailResult = await (this.emailService as any).mailerService.sendMail({
        to: emailJob.recipientEmail,
        subject: emailJob.subject,
        html: emailJob.htmlContent,
        text: emailJob.textContent,
        attachments: [], // Add attachments if needed
      });

      // Update status to sent
      emailJob.status = EmailStatus.SENT;
      emailJob.sentAt = new Date();
      await this.emailQueueRepository.save(emailJob);

      this.logger.log(`Email sent successfully to ${emailJob.recipientEmail}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`);

      // Update status to failed and increment retry count
      const emailJob = await this.emailQueueRepository.findOne({
        where: { id: jobId },
      });

      if (emailJob) {
        emailJob.retryCount += 1;
        if (emailJob.retryCount >= emailJob.maxRetries) {
          emailJob.status = EmailStatus.FAILED;
        } else {
          emailJob.status = EmailStatus.PENDING; // Reset to pending for retry
        }
        await this.emailQueueRepository.save(emailJob);
      }

      return false;
    }
  }

  async getPendingEmails(): Promise<EmailQueue[]> {
    return await this.emailQueueRepository.find({
      where: {
        status: EmailStatus.PENDING,
        scheduledAt: null, // Only unscheduled emails
      },
    });
  }

  async getFailedEmails(): Promise<EmailQueue[]> {
    return await this.emailQueueRepository
      .createQueryBuilder('email')
      .where('email.status = :status', { status: EmailStatus.FAILED })
      .andWhere('email.retryCount < email.maxRetries')
      .getMany();
  }

  async getQueuedEmails(): Promise<EmailQueue[]> {
    return await this.emailQueueRepository.find({
      where: {
        status: EmailStatus.PENDING,
      },
    });
  }
}
