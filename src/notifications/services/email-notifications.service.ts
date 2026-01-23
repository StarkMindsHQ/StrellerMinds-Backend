import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailQueue, EmailStatus } from '../entities/email-queue.entity';
import { EmailTemplate } from '../entities/email-template.entity';
import { SendEmailDto } from '../dto/send-email.dto';
import { CreateEmailTemplateDto } from '../dto/create-email-template.dto';
import { UpdateEmailTemplateDto } from '../dto/update-email-template.dto';
import { NotificationPreference } from '../entities/notification-preference.entity';
import { EmailAnalytics } from '../entities\email-analytics.entity';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailNotificationsService {
  private readonly logger = new Logger(EmailNotificationsService.name);

  constructor(
    @InjectRepository(EmailQueue)
    private emailQueueRepository: Repository<EmailQueue>,
    @InjectRepository(EmailTemplate)
    private emailTemplateRepository: Repository<EmailTemplate>,
    @InjectRepository(NotificationPreference)
    private notificationPreferenceRepository: Repository<NotificationPreference>,
    @InjectRepository(EmailAnalytics)
    private emailAnalyticsRepository: Repository<EmailAnalytics>,
    private mailerService: MailerService,
    private configService: ConfigService,
  ) {}

  async sendEmail(sendEmailDto: SendEmailDto): Promise<EmailQueue> {
    try {
      // Check user's notification preferences
      const preferences = await this.getUserPreferences(sendEmailDto.to);
      if (!preferences?.emailEnabled) {
        throw new Error('User has disabled email notifications');
      }

      // Create email job
      const emailJob = new EmailQueue();
      emailJob.recipientEmail = sendEmailDto.to;
      emailJob.recipientName = sendEmailDto.name;
      emailJob.subject = sendEmailDto.subject;
      emailJob.htmlContent = sendEmailDto.htmlContent;
      emailJob.textContent = sendEmailDto.textContent;
      emailJob.templateData = sendEmailDto.templateData;
      emailJob.scheduledAt = sendEmailDto.scheduleAt;
      emailJob.status = EmailStatus.PENDING;

      // If using a template, load it
      if (sendEmailDto.templateId) {
        const template = await this.emailTemplateRepository.findOne({
          where: { id: sendEmailDto.templateId, isActive: true },
        });

        if (!template) {
          throw new Error(`Template with ID ${sendEmailDto.templateId} not found or inactive`);
        }

        emailJob.subject = this.replacePlaceholders(template.subject, sendEmailDto.templateData);
        emailJob.htmlContent = this.replacePlaceholders(template.htmlContent, sendEmailDto.templateData);
        emailJob.textContent = template.textContent ? this.replacePlaceholders(template.textContent, sendEmailDto.templateData) : undefined;
      } else if (sendEmailDto.templateType) {
        const template = await this.emailTemplateRepository.findOne({
          where: { type: sendEmailDto.templateType, isActive: true },
        });

        if (!template) {
          throw new Error(`Template of type ${sendEmailDto.templateType} not found or inactive`);
        }

        emailJob.subject = this.replacePlaceholders(template.subject, sendEmailDto.templateData);
        emailJob.htmlContent = this.replacePlaceholders(template.htmlContent, sendEmailDto.templateData);
        emailJob.textContent = template.textContent ? this.replacePlaceholders(template.textContent, sendEmailDto.templateData) : undefined;
      }

      // Apply language-specific template if needed
      if (sendEmailDto.language && sendEmailDto.templateId) {
        const template = await this.emailTemplateRepository.findOne({
          where: { id: sendEmailDto.templateId },
        });

        if (template && template.languages && template.languages[sendEmailDto.language]) {
          const langTemplate = template.languages[sendEmailDto.language];
          emailJob.subject = this.replacePlaceholders(langTemplate.subject, sendEmailDto.templateData);
          emailJob.htmlContent = this.replacePlaceholders(langTemplate.htmlContent, sendEmailDto.templateData);
          emailJob.textContent = langTemplate.textContent ? this.replacePlaceholders(langTemplate.textContent, sendEmailDto.templateData) : undefined;
        }
      }

      // Save the email job to the queue
      const savedJob = await this.emailQueueRepository.save(emailJob);

      // Process immediately if not scheduled
      if (!sendEmailDto.scheduleAt) {
        await this.processEmailJob(savedJob.id);
      }

      return savedJob;
    } catch (error) {
      this.logger.error(`Failed to queue email: ${error.message}`);
      throw error;
    }
  }

  async processEmailJob(jobId: string): Promise<boolean> {
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
      await this.mailerService.sendMail({
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

      // Update analytics
      await this.updateAnalytics(emailJob, true);

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

        // Update analytics for failure
        await this.updateAnalytics(emailJob, false);
      }

      return false;
    }
  }

  async createTemplate(createTemplateDto: CreateEmailTemplateDto): Promise<EmailTemplate> {
    const template = new EmailTemplate();
    Object.assign(template, createTemplateDto);
    return await this.emailTemplateRepository.save(template);
  }

  async updateTemplate(id: string, updateTemplateDto: UpdateEmailTemplateDto): Promise<EmailTemplate> {
    const template = await this.emailTemplateRepository.findOne({ where: { id } });
    if (!template) {
      throw new Error(`Template with ID ${id} not found`);
    }

    Object.assign(template, updateTemplateDto);
    return await this.emailTemplateRepository.save(template);
  }

  async getTemplateById(id: string): Promise<EmailTemplate> {
    return await this.emailTemplateRepository.findOne({ where: { id } });
  }

  async getTemplateByType(type: string): Promise<EmailTemplate> {
    return await this.emailTemplateRepository.findOne({ where: { type, isActive: true } });
  }

  async getUserPreferences(email: string): Promise<NotificationPreference | null> {
    // This assumes we have a way to get the user ID from the email
    // In a real implementation, you'd likely have the user ID passed in
    return await this.notificationPreferenceRepository.findOne({
      where: { userId: email }, // Simplified - in reality you'd look up by user ID
    });
  }

  async updateNotificationPreferences(userId: string, preferences: any): Promise<NotificationPreference> {
    let userPrefs = await this.notificationPreferenceRepository.findOne({
      where: { userId },
    });

    if (!userPrefs) {
      userPrefs = new NotificationPreference();
      userPrefs.userId = userId;
    }

    Object.assign(userPrefs, preferences);
    return await this.notificationPreferenceRepository.save(userPrefs);
  }

  async updateAnalytics(emailJob: EmailQueue, success: boolean): Promise<void> {
    let analytics = await this.emailAnalyticsRepository.findOne({
      where: { emailQueueId: emailJob.id },
    });

    if (!analytics) {
      analytics = new EmailAnalytics();
      analytics.emailQueueId = emailJob.id;
      analytics.recipientEmail = emailJob.recipientEmail;
      analytics.subject = emailJob.subject;
    }

    if (success) {
      analytics.sentCount += 1;
    } else {
      analytics.sentCount += 1; // Still count as attempted
    }

    await this.emailAnalyticsRepository.save(analytics);
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

  async getPendingEmails(): Promise<EmailQueue[]> {
    return await this.emailQueueRepository.find({
      where: { status: EmailStatus.PENDING },
    });
  }

  async getFailedEmails(): Promise<EmailQueue[]> {
    return await this.emailQueueRepository.find({
      where: { status: EmailStatus.FAILED },
    });
  }
}