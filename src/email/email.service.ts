import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { EmailTemplate } from './entities/email-template.entity';
import { EmailLog } from './entities/email-log.entity';
import { EmailPreference } from './entities/email-preference.entity';
import { addTrackingToEmail, generateEmailId } from './utils/tracking.util';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  templateName: string;
  context: Record<string, any>;
  attachments?: any[];
  cc?: string | string[];
  bcc?: string | string[];
  skipTracking?: boolean;
}

enum EmailType {
  VERIFICATION = 'email-verification',
  ENROLLMENT = 'course-enrollment',
  COMPLETION = 'course-completion',
  FORUM = 'forum-notification',
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(
    private configService: ConfigService,
    @InjectQueue('email') private emailQueue: Queue,
    @InjectRepository(EmailTemplate)
    private emailTemplateRepository: Repository<EmailTemplate>,
    @InjectRepository(EmailLog)
    private emailLogRepository: Repository<EmailLog>,
    @InjectRepository(EmailPreference)
    private emailPreferenceRepository: Repository<EmailPreference>,
  ) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('EMAIL_HOST'),
      port: this.configService.get<number>('EMAIL_PORT'),
      secure: this.configService.get<boolean>('EMAIL_SECURE', false),
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASSWORD'),
      },
    });
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    const emailEnabled = this.configService.get<string>('EMAIL_ENABLED');
    if (emailEnabled === 'false' || emailEnabled === '0') {
      this.logger.log('Email sending is disabled by EMAIL_ENABLED flag. Skipping email.');
      return false;
    }
    try {
      if (await this.hasUserOptedOut(options.to, options.templateName)) {
        this.logger.log(`User ${options.to} has opted out of ${options.templateName} emails`);
        return false;
      }
      await this.emailQueue.add('send', options, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      });
      return true;
    } catch (error) {
      this.logger.error(`Failed to queue email: ${error.message}`, error.stack);
      return false;
    }
  }

  async sendImmediate(options: EmailOptions): Promise<boolean> {
    const emailEnabled = this.configService.get<string>('EMAIL_ENABLED');
    if (emailEnabled === 'false' || emailEnabled === '0') {
      this.logger.log('Email sending is disabled by EMAIL_ENABLED flag. Skipping immediate email.');
      return false;
    }
    try {
      const template = await this.getTemplate(options.templateName);
      const compiledTemplate = Handlebars.compile(template);
      let html = compiledTemplate(options.context);
      const emailId = generateEmailId();

      if (!options.skipTracking) {
        const baseUrl = this.configService.get<string>('BASE_URL');
        html = addTrackingToEmail(html, emailId, baseUrl);
      }

      const mailOptions = {
        from: this.configService.get<string>('EMAIL_FROM'),
        to: options.to,
        cc: options.cc,
        bcc: options.bcc,
        subject: options.subject,
        html,
        attachments: options.attachments || [],
      };

      const info = await this.transporter.sendMail(mailOptions);

      await this.logEmail({
        id: emailId,
        recipient: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        templateName: options.templateName,
        messageId: info.messageId,
        status: 'sent',
      });

      return true;
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);
      await this.logEmail({
        recipient: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        templateName: options.templateName,
        status: 'failed',
        error: error.message,
      });

      return false;
    }
  }

  async getTemplate(templateName: string): Promise<string> {
    const dbTemplate = await this.emailTemplateRepository.findOne({ where: { name: templateName } });
    if (dbTemplate) return dbTemplate.content;

    const templatePath = path.join(process.cwd(), 'src/email/templates', `${templateName}.hbs`);
    return fs.readFileSync(templatePath, 'utf8');
  }

  private async logEmail(logData: Partial<EmailLog>): Promise<void> {
    const log = this.emailLogRepository.create(logData);
    await this.emailLogRepository.save(log);
  }

  private async hasUserOptedOut(
    recipient: string | string[],
    templateType: string,
  ): Promise<boolean> {
    if (Array.isArray(recipient)) {
      for (const email of recipient) {
        const preference = await this.emailPreferenceRepository.findOne({ where: { email, optOut: true } });
        if (preference) return true;
      }
      return false;
    }

    const preference = await this.emailPreferenceRepository.findOne({ where: { email: recipient, optOut: true } });
    return !!preference;
  }

  async updateEmailPreference(email: string, emailType: string, optOut: boolean): Promise<EmailPreference> {
    let preference = await this.emailPreferenceRepository.findOne({ where: { email } });

    if (preference) {
      preference.optOut = optOut;
    } else {
      preference = this.emailPreferenceRepository.create({ email, optOut });
    }

    return this.emailPreferenceRepository.save(preference);
  }

  async getEmailAnalytics(startDate: Date, endDate: Date, templateName?: string): Promise<any> {
    const query = this.emailLogRepository
      .createQueryBuilder('log')
      .select('log.templateName', 'templateName')
      .addSelect('COUNT(*)', 'count')
      .addSelect('log.status', 'status')
      .where('log.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('log.templateName')
      .addGroupBy('log.status');

    if (templateName) {
      query.andWhere('log.templateName = :templateName', { templateName });
    }

    return query.getRawMany();
  }

  async sendVerificationEmail(user: any, verificationCode: string, verificationToken: string): Promise<boolean> {
    const verificationUrl = `${this.configService.get<string>('FRONTEND_URL')}/verify-email?token=${verificationToken}`;
    const unsubscribeUrl = `${this.configService.get<string>('FRONTEND_URL')}/preferences?email=${user.email}`;

    return this.sendEmail({
      to: user.email,
      subject: 'Verify Your Email Address',
      templateName: 'email-verification',
      context: {
        name: user.name,
        verificationUrl,
        verificationCode,
        expiryTime: 24,
        unsubscribeUrl,
        year: new Date().getFullYear(),
      },
    });
  }

  async sendCourseEnrollmentEmail(user: any, course: any): Promise<boolean> {
    const courseUrl = `${this.configService.get<string>('FRONTEND_URL')}/courses/${course.id}`;
    const unsubscribeUrl = `${this.configService.get<string>('FRONTEND_URL')}/preferences?email=${user.email}`;

    return this.sendEmail({
      to: user.email,
      subject: `Enrollment Confirmation: ${course.name}`,
      templateName: 'course-enrollment',
      context: {
        name: user.name,
        courseName: course.name,
        instructorName: course.instructor.name,
        startDate: new Date(course.startDate).toLocaleDateString(),
        duration: course.duration,
        courseUrl,
        unsubscribeUrl,
        year: new Date().getFullYear(),
      },
    });
  }

  async sendCourseCompletionEmail(user: any, course: any, score: number): Promise<boolean> {
    const certificateUrl = `${this.configService.get<string>('FRONTEND_URL')}/certificates/${course.id}`;
    const courseCatalogUrl = `${this.configService.get<string>('FRONTEND_URL')}/courses`;
    const unsubscribeUrl = `${this.configService.get<string>('FRONTEND_URL')}/preferences?email=${user.email}`;

    return this.sendEmail({
      to: user.email,
      subject: `Congratulations on Completing ${course.name}!`,
      templateName: 'course-completion',
      context: {
        name: user.name,
        courseName: course.name,
        score,
        completionDate: new Date().toLocaleDateString(),
        certificateUrl,
        courseCatalogUrl,
        unsubscribeUrl,
        year: new Date().getFullYear(),
      },
    });
  }

  async sendForumNotificationEmail(user: any, notification: any): Promise<boolean> {
    const postUrl = `${this.configService.get<string>('FRONTEND_URL')}/forum/posts/${notification.postId}`;
    const unsubscribeUrl = `${this.configService.get<string>('FRONTEND_URL')}/preferences?email=${user.email}`;

    return this.sendEmail({
      to: user.email,
      subject: `Forum Notification: ${notification.type}`,
      templateName: 'forum-notification',
      context: {
        name: user.name,
        notificationType: notification.type,
        notificationMessage: notification.message,
        postAuthor: notification.post.author.name,
        postDate: new Date(notification.post.createdAt).toLocaleDateString(),
        postContent: notification.post.content,
        postUrl,
        unsubscribeUrl,
        year: new Date().getFullYear(),
      },
    });
  }

  async markEmailAsClicked(id: string, url: string): Promise<void> {
  }

  async markEmailAsOpened(id: string): Promise<void> {
  }

   async verifyUnsubscribeToken(email: string, token: string): Promise<boolean> {
    // TODO: Implement actual token verification logic
    // For now, return true as a placeholder
    return true;
  }

   async getDailyEmailStats(start: Date, end: Date, templateName?: string): Promise<any> {
    // Implement your logic here or return a mock for now
    return [];
  }

  async getUserPreferences(email: string): Promise<{ emailType: EmailType; optedOut: boolean }[]> {
    const preferences = await this.emailPreferenceRepository.find({ where: { email } });

    return Object.values(EmailType).map((type) => {
      const preference = preferences.find((p) => p.email === email && p.optOut);
      return {
        emailType: type,
        optedOut: !!preference,
      };
    });
  }
}
