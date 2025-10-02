import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailTemplate } from '../entities/email-template.entity';
import { CreateTemplateDto, UpdateTemplateDto } from './dto/template.dto';

@Injectable()
export class EmailTemplateService {
  constructor(
    @InjectRepository(EmailTemplate)
    private emailTemplateRepository: Repository<EmailTemplate>,
  ) {}

  async findAll(): Promise<EmailTemplate[]> {
    return this.emailTemplateRepository.find({
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<EmailTemplate> {
    const template = await this.emailTemplateRepository.findOne({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException(`Email template with ID ${id} not found`);
    }

    return template;
  }

  async findByName(name: string): Promise<EmailTemplate> {
    const template = await this.emailTemplateRepository.findOne({
      where: { name },
    });

    if (!template) {
      throw new NotFoundException(`Email template with name ${name} not found`);
    }

    return template;
  }

  async create(createTemplateDto: CreateTemplateDto): Promise<EmailTemplate> {
    const template = this.emailTemplateRepository.create(createTemplateDto);
    return this.emailTemplateRepository.save(template);
  }

  async update(id: string, updateTemplateDto: UpdateTemplateDto): Promise<EmailTemplate> {
    const template = await this.findOne(id);

    // Update the template properties
    Object.assign(template, updateTemplateDto);

    return this.emailTemplateRepository.save(template);
  }

  async remove(id: string): Promise<void> {
    const template = await this.findOne(id);
    await this.emailTemplateRepository.remove(template);
  }

  async validateTemplate(
    name: string,
    context: Record<string, any>,
  ): Promise<{ valid: boolean; errors?: string[] }> {
    try {
      const template = await this.findByName(name);
      const handlebars = require('handlebars');
      handlebars.compile(template.content)(context);

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        errors: [error.message],
      };
    }
  }

  async seedDefaultTemplates(): Promise<void> {
    const defaultTemplates = [
      {
        name: 'welcome',
        subject: 'Welcome to Our Platform',
        content: this.getDefaultWelcomeTemplate(),
        description: 'Sent to new users after registration',
      },
      {
        name: 'reset-password',
        subject: 'Reset Your Password',
        content: this.getDefaultResetPasswordTemplate(),
        description: 'Sent when a user requests a password reset',
      },
      {
        name: 'email-verification',
        subject: 'Verify Your Email Address',
        content: this.getDefaultVerificationTemplate(),
        description: "Sent to verify a user's email address",
      },
      {
        name: 'course-enrollment',
        subject: 'Course Enrollment Confirmation',
        content: this.getDefaultCourseEnrollmentTemplate(),
        description: 'Sent when a user enrolls in a course',
      },
      {
        name: 'course-completion',
        subject: 'Course Completion Certificate',
        content: this.getDefaultCourseCompletionTemplate(),
        description: 'Sent when a user completes a course',
      },
      {
        name: 'forum-notification',
        subject: 'Forum Notification',
        content: this.getDefaultForumNotificationTemplate(),
        description: 'Sent for forum activity notifications',
      },
    ];

    for (const template of defaultTemplates) {
      const existing = await this.emailTemplateRepository.findOne({
        where: { name: template.name },
      });

      if (!existing) {
        await this.create(template);
      }
    }
  }

  private getDefaultWelcomeTemplate(): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Our Platform</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background-color: #f8f9fa;
      padding: 20px;
      text-align: center;
      border-bottom: 1px solid #e9ecef;
    }
    .content {
      padding: 20px;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #6c757d;
      border-top: 1px solid #e9ecef;
    }
    .button {
      display: inline-block;
      background-color: #007bff;
      color: white;
      text-decoration: none;
      padding: 10px 20px;
      border-radius: 4px;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to Our Platform</h1>
    </div>
    <div class="content">
      <p>Hello {{name}},</p>
      <p>Thank you for joining our platform! We're excited to have you on board.</p>
      <p>Your account has been successfully created and you can now start using our services.</p>
      <p>
        <a href="{{loginUrl}}" class="button">Login to Your Account</a>
      </p>
      <p>If you have any questions, feel free to contact our support team.</p>
      <p>Best regards,<br>The Team</p>
    </div>
    <div class="footer">
      <p>© {{year}} Our Company. All rights reserved.</p>
      <p>
        <a href="{{unsubscribeUrl}}">Unsubscribe</a> from these emails.
      </p>
    </div>
  </div>
</body>
</html>`;
  }

  private getDefaultResetPasswordTemplate(): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background-color: #f8f9fa;
      padding: 20px;
      text-align: center;
      border-bottom: 1px solid #e9ecef;
    }
    .content {
      padding: 20px;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #6c757d;
      border-top: 1px solid #e9ecef;
    }
    .button {
      display: inline-block;
      background-color: #007bff;
      color: white;
      text-decoration: none;
      padding: 10px 20px;
      border-radius: 4px;
      margin-top: 20px;
    }
    .code {
      font-family: monospace;
      font-size: 24px;
      letter-spacing: 2px;
      background-color: #f8f9fa;
      padding: 10px;
      border-radius: 4px;
      margin: 20px 0;
      display: inline-block;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Reset Your Password</h1>
    </div>
    <div class="content">
      <p>Hello,</p>
      <p>We received a request to reset your password. If you didn't make this request, you can safely ignore this email.</p>
      <p>To reset your password, click the button below:</p>
      <p>
        <a href="{{resetUrl}}" class="button">Reset Password</a>
      </p>
      <p>Or use this code:</p>
      <div class="code">{{resetCode}}</div>
      <p>This link and code will expire in {{expiryTime}} hours.</p>
      <p>Best regards,<br>The Team</p>
    </div>
    <div class="footer">
      <p>© {{year}} Our Company. All rights reserved.</p>
      <p>If you didn't request this password reset, please contact our support team immediately.</p>
    </div>
  </div>
</body>
</html>`;
  }

  private getDefaultVerificationTemplate(): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email Address</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background-color: #f8f9fa;
      padding: 20px;
      text-align: center;
      border-bottom: 1px solid #e9ecef;
    }
    .content {
      padding: 20px;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #6c757d;
      border-top: 1px solid #e9ecef;
    }
    .button {
      display: inline-block;
      background-color: #007bff;
      color: white;
      text-decoration: none;
      padding: 10px 20px;
      border-radius: 4px;
      margin-top: 20px;
    }
    .verification-code {
      font-family: monospace;
      font-size: 24px;
      letter-spacing: 2px;
      background-color: #f8f9fa;
      padding: 10px;
      border-radius: 4px;
      margin: 20px 0;
      display: inline-block;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Verify Your Email Address</h1>
    </div>
    <div class="content">
      <p>Hello {{name}},</p>
      <p>Thank you for signing up! To complete your registration, please verify your email address by clicking the button below:</p>
      <p>
        <a href="{{verificationUrl}}" class="button">Verify Email Address</a>
      </p>
      <p>Or enter this verification code on the verification page:</p>
      <div class="verification-code">{{verificationCode}}</div>
      <p>This verification link and code will expire in {{expiryTime}} hours.</p>
      <p>If you didn't create an account, you can safely ignore this email.</p>
      <p>Best regards,<br>The Team</p>
    </div>
    <div class="footer">
      <p>© {{year}} Our Company. All rights reserved.</p>
      <p>
        <a href="{{unsubscribeUrl}}">Unsubscribe</a> from these emails.
      </p>
    </div>
  </div>
</body>
</html>`;
  }

  private getDefaultCourseEnrollmentTemplate(): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Course Enrollment Confirmation</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background-color: #f8f9fa;
      padding: 20px;
      text-align: center;
      border-bottom: 1px solid #e9ecef;
    }
    .content {
      padding: 20px;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #6c757d;
      border-top: 1px solid #e9ecef;
    }
    .button {
      display: inline-block;
      background-color: #007bff;
      color: white;
      text-decoration: none;
      padding: 10px 20px;
      border-radius: 4px;
      margin-top: 20px;
    }
    .course-info {
      background-color: #f8f9fa;
      border-radius: 4px;
      padding: 15px;
      margin: 20px 0;
    }
    .course-title {
      font-weight: bold;
      font-size: 18px;
      margin-bottom: 10px;
    }
    .course-details {
      margin-bottom: 5px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Course Enrollment Confirmation</h1>
    </div>
    <div class="content">
      <p>Hello {{name}},</p>
      <p>Congratulations! You have successfully enrolled in the following course:</p>
      
      <div class="course-info">
        <div class="course-title">{{courseName}}</div>
        <div class="course-details"><strong>Instructor:</strong> {{instructorName}}</div>
        <div class="course-details"><strong>Start Date:</strong> {{startDate}}</div>
        <div class="course-details"><strong>Duration:</strong> {{duration}}</div>
      </div>
      
      <p>You can access your course materials by clicking the button below:</p>
      <p>
        <a href="{{courseUrl}}" class="button">Access Course</a>
      </p>
      
      <p>If you have any questions about the course, please don't hesitate to contact our support team.</p>
      <p>We wish you success in your learning journey!</p>
      <p>Best regards,<br>The Education Team</p>
    </div>
    <div class="footer">
      <p>© {{year}} Our Company. All rights reserved.</p>
      <p>
        <a href="{{unsubscribeUrl}}">Manage email preferences</a>
      </p>
    </div>
  </div>
</body>
</html>`;
  }

  private getDefaultCourseCompletionTemplate(): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Course Completion Certificate</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background-color: #f8f9fa;
      padding: 20px;
      text-align: center;
      border-bottom: 1px solid #e9ecef;
    }
    .content {
      padding: 20px;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #6c757d;
      border-top: 1px solid #e9ecef;
    }
    .button {
      display: inline-block;
      background-color: #007bff;
      color: white;
      text-decoration: none;
      padding: 10px 20px;
      border-radius: 4px;
      margin-top: 20px;
    }
    .certificate {
      border: 2px solid #007bff;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
      text-align: center;
      background-color: #f8f9fa;
    }
    .certificate-title {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 15px;
      color: #007bff;
    }
    .certificate-text {
      font-size: 16px;
      margin-bottom: 10px;
    }
    .certificate-course {
      font-size: 20px;
      font-weight: bold;
      margin: 15px 0;
    }
    .certificate-date {
      font-style: italic;
      margin-top: 15px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Congratulations on Completing Your Course!</h1>
    </div>
    <div class="content">
      <p>Hello {{name}},</p>
      <p>Congratulations on successfully completing the course "{{courseName}}"! We're proud of your dedication and hard work.</p>
      
      <div class="certificate">
        <div class="certificate-title">Certificate of Completion</div>
        <div class="certificate-text">This certifies that</div>
        <div class="certificate-text"><strong>{{name}}</strong></div>
        <div class="certificate-text">has successfully completed</div>
        <div class="certificate-course">{{courseName}}</div>
        <div class="certificate-text">with a score of {{score}}%</div>
        <div class="certificate-date">Completed on {{completionDate}}</div>
      </div>
      
      <p>You can download your official certificate and share your achievement by clicking the button below:</p>
      <p>
        <a href="{{certificateUrl}}" class="button">Download Certificate</a>
      </p>
      
      <p>We hope you enjoyed the course and found it valuable. Check out our other courses that might interest you:</p>
      <p>
        <a href="{{courseCatalogUrl}}" class="button">Explore More Courses</a>
      </p>
      
      <p>Best regards,<br>The Education Team</p>
    </div>
    <div class="footer">
      <p>© {{year}} Our Company. All rights reserved.</p>
      <p>
        <a href="{{unsubscribeUrl}}">Manage email preferences</a>
      </p>
    </div>
  </div>
</body>
</html>`;
  }

  private getDefaultForumNotificationTemplate(): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Forum Notification</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background-color: #f8f9fa;
      padding: 20px;
      text-align: center;
      border-bottom: 1px solid #e9ecef;
    }
    .content {
      padding: 20px;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #6c757d;
      border-top: 1px solid #e9ecef;
    }
    .button {
      display: inline-block;
      background-color: #007bff;
      color: white;
      text-decoration: none;
      padding: 10px 20px;
      border-radius: 4px;
      margin-top: 20px;
    }
    .forum-post {
      background-color: #f8f9fa;
      border-left: 4px solid #007bff;
      padding: 15px;
      margin: 20px 0;
      border-radius: 0 4px 4px 0;
    }
    .post-author {
      font-weight: bold;
      margin-bottom: 5px;
    }
    .post-date {
      font-size: 12px;
      color: #6c757d;
      margin-bottom: 10px;
    }
    .post-content {
      margin-bottom: 10px;
    }
    .notification-type {
      display: inline-block;
      background-color: #007bff;
      color: white;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 12px;
      margin-bottom: 10px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Forum Notification</h1>
    </div>
    <div class="content">
      <p>Hello {{name}},</p>
      
      <div class="notification-type">{{notificationType}}</div>
      
      <p>{{notificationMessage}}</p>
      
      <div class="forum-post">
        <div class="post-author">{{postAuthor}}</div>
        <div class="post-date">{{postDate}}</div>
        <div class="post-content">{{postContent}}</div>
      </div>
      
      <p>
        <a href="{{postUrl}}" class="button">View in Forum</a>
      </p>
      
      <p>Best regards,<br>The Forum Team</p>
    </div>
    <div class="footer">
      <p>© {{year}} Our Company. All rights reserved.</p>
      <p>
        <a href="{{unsubscribeUrl}}">Manage notification preferences</a>
      </p>
    </div>
  </div>
</body>
</html>`;
  }
}
