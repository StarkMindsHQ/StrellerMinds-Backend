import { Injectable, Logger } from '@nestjs/common';
import { NotificationType, NotificationChannel } from '../models/Notification';

export interface Template {
  id: string;
  name: string;
  type: NotificationType;
  channels: NotificationChannel[];
  subject?: string;
  content: string;
  htmlContent?: string;
  variables: TemplateVariable[];
  localization: Record<string, TemplateLocalization>;
  metadata?: any;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
  required: boolean;
  defaultValue?: any;
  description?: string;
}

export interface TemplateLocalization {
  subject?: string;
  content: string;
  htmlContent?: string;
}

export interface CompiledTemplate {
  subject?: string;
  content: string;
  htmlContent?: string;
  variables: string[];
}

export interface TemplateRenderContext {
  locale?: string;
  user?: any;
  data?: Record<string, any>;
  metadata?: any;
}

@Injectable()
export class TemplateEngine {
  private readonly logger = new Logger(TemplateEngine.name);
  private readonly templates = new Map<string, Template>();
  private readonly compiledTemplates = new Map<string, CompiledTemplate>();

  constructor() {
    this.initializeDefaultTemplates();
  }

  private initializeDefaultTemplates(): void {
    // Welcome email template
    const welcomeTemplate: Template = {
      id: 'welcome_email',
      name: 'Welcome Email',
      type: NotificationType.SYSTEM,
      channels: [NotificationChannel.EMAIL],
      subject: 'Welcome to StrellerMinds!',
      content: `Hello {{user.firstName}},

Welcome to StrellerMinds! We're excited to have you join our learning community.

Your account has been successfully created with the email {{user.email}}.

What's next:
- Complete your profile
- Browse available courses
- Join our community forums

If you have any questions, don't hesitate to reach out to our support team.

Best regards,
The StrellerMinds Team`,
      htmlContent: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Welcome to StrellerMinds</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #333;">Welcome to StrellerMinds, {{user.firstName}}!</h1>
    
    <p>We're excited to have you join our learning community.</p>
    
    <p>Your account has been successfully created with the email <strong>{{user.email}}</strong>.</p>
    
    <h2>What's next:</h2>
    <ul>
        <li>Complete your profile</li>
        <li>Browse available courses</li>
        <li>Join our community forums</li>
    </ul>
    
    <p>If you have any questions, don't hesitate to reach out to our support team.</p>
    
    <p>Best regards,<br>The StrellerMinds Team</p>
</body>
</html>`,
      variables: [
        { name: 'user.firstName', type: 'string', required: true, description: 'User first name' },
        { name: 'user.email', type: 'string', required: true, description: 'User email' },
      ],
      localization: {
        en: {
          subject: 'Welcome to StrellerMinds!',
          content: `Hello {{user.firstName}},

Welcome to StrellerMinds! We're excited to have you join our learning community.

Your account has been successfully created with the email {{user.email}}.

What's next:
- Complete your profile
- Browse available courses
- Join our community forums

If you have any questions, don't hesitate to reach out to our support team.

Best regards,
The StrellerMinds Team`,
        },
        es: {
          subject: '¡Bienvenido a StrellerMinds!',
          content: `Hola {{user.firstName}},

¡Te damos la bienvenida a StrellerMinds! Estamos emocionados de tenerte en nuestra comunidad de aprendizaje.

Tu cuenta ha sido creada exitosamente con el email {{user.email}}.

¿Qué sigue?
- Completa tu perfil
- Explora los cursos disponibles
- Únete a nuestros foros comunitarios

Si tienes alguna pregunta, no dudes en contactar a nuestro equipo de soporte.

Saludos cordiales,
El equipo de StrellerMinds`,
        },
      },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Assignment due reminder template
    const assignmentReminderTemplate: Template = {
      id: 'assignment_due_reminder',
      name: 'Assignment Due Reminder',
      type: NotificationType.ASSIGNMENT,
      channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP, NotificationChannel.PUSH],
      subject: 'Assignment Due Soon: {{assignment.title}}',
      content: `Hi {{user.firstName}},

This is a reminder that your assignment "{{assignment.title}}" is due on {{assignment.dueDate}}.

Assignment details:
- Course: {{course.title}}
- Due date: {{assignment.dueDate}}
- Time remaining: {{timeRemaining}}

Please make sure to submit your work before the deadline.

Good luck!
The StrellerMinds Team`,
      htmlContent: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Assignment Due Reminder</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #e74c3c;">Assignment Due Soon!</h1>
    
    <p>Hi {{user.firstName}},</p>
    
    <p>This is a reminder that your assignment "<strong>{{assignment.title}}</strong>" is due on <strong>{{assignment.dueDate}}</strong>.</p>
    
    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3>Assignment details:</h3>
        <ul>
            <li><strong>Course:</strong> {{course.title}}</li>
            <li><strong>Due date:</strong> {{assignment.dueDate}}</li>
            <li><strong>Time remaining:</strong> {{timeRemaining}}</li>
        </ul>
    </div>
    
    <p>Please make sure to submit your work before the deadline.</p>
    
    <p>Good luck!<br>The StrellerMinds Team</p>
</body>
</html>`,
      variables: [
        { name: 'user.firstName', type: 'string', required: true, description: 'User first name' },
        { name: 'assignment.title', type: 'string', required: true, description: 'Assignment title' },
        { name: 'assignment.dueDate', type: 'date', required: true, description: 'Assignment due date' },
        { name: 'course.title', type: 'string', required: true, description: 'Course title' },
        { name: 'timeRemaining', type: 'string', required: true, description: 'Time remaining until due' },
      ],
      localization: {
        en: {
          subject: 'Assignment Due Soon: {{assignment.title}}',
          content: `Hi {{user.firstName}},

This is a reminder that your assignment "{{assignment.title}}" is due on {{assignment.dueDate}}.

Assignment details:
- Course: {{course.title}}
- Due date: {{assignment.dueDate}}
- Time remaining: {{timeRemaining}}

Please make sure to submit your work before the deadline.

Good luck!
The StrellerMinds Team`,
        },
      },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Grade notification template
    const gradeTemplate: Template = {
      id: 'grade_notification',
      name: 'Grade Notification',
      type: NotificationType.GRADE,
      channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      subject: 'Grade Posted: {{assignment.title}}',
      content: `Hi {{user.firstName}},

Your grade has been posted for "{{assignment.title}}".

Grade details:
- Score: {{grade.score}}/{{grade.maxScore}}
- Percentage: {{grade.percentage}}%
- Feedback: {{grade.feedback}}

View your detailed feedback on the course page.

Best regards,
The StrellerMinds Team`,
      htmlContent: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Grade Posted</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #27ae60;">Grade Posted!</h1>
    
    <p>Hi {{user.firstName}},</p>
    
    <p>Your grade has been posted for "<strong>{{assignment.title}}</strong>".</p>
    
    <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
        <h3>Grade details:</h3>
        <ul>
            <li><strong>Score:</strong> {{grade.score}}/{{grade.maxScore}}</li>
            <li><strong>Percentage:</strong> {{grade.percentage}}%</li>
            <li><strong>Feedback:</strong> {{grade.feedback}}</li>
        </ul>
    </div>
    
    <p>View your detailed feedback on the course page.</p>
    
    <p>Best regards,<br>The StrellerMinds Team</p>
</body>
</html>`,
      variables: [
        { name: 'user.firstName', type: 'string', required: true, description: 'User first name' },
        { name: 'assignment.title', type: 'string', required: true, description: 'Assignment title' },
        { name: 'grade.score', type: 'number', required: true, description: 'Grade score' },
        { name: 'grade.maxScore', type: 'number', required: true, description: 'Maximum possible score' },
        { name: 'grade.percentage', type: 'number', required: true, description: 'Grade percentage' },
        { name: 'grade.feedback', type: 'string', required: false, description: 'Grade feedback' },
      ],
      localization: {
        en: {
          subject: 'Grade Posted: {{assignment.title}}',
          content: `Hi {{user.firstName}},

Your grade has been posted for "{{assignment.title}}".

Grade details:
- Score: {{grade.score}}/{{grade.maxScore}}
- Percentage: {{grade.percentage}}%
- Feedback: {{grade.feedback}}

View your detailed feedback on the course page.

Best regards,
The StrellerMinds Team`,
        },
      },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Security alert template
    const securityTemplate: Template = {
      id: 'security_alert',
      name: 'Security Alert',
      type: NotificationType.SECURITY,
      channels: [NotificationChannel.EMAIL, NotificationChannel.SMS],
      subject: 'Security Alert: {{alert.type}}',
      content: `Hi {{user.firstName}},

We detected a security activity on your account:

{{alert.description}}

Details:
- Activity: {{alert.type}}
- Time: {{alert.timestamp}}
- Location: {{alert.location}}
- Device: {{alert.device}}

If this was you, no action is needed. If you don't recognize this activity, please secure your account immediately.

Security Team
StrellerMinds`,
      variables: [
        { name: 'user.firstName', type: 'string', required: true, description: 'User first name' },
        { name: 'alert.type', type: 'string', required: true, description: 'Alert type' },
        { name: 'alert.description', type: 'string', required: true, description: 'Alert description' },
        { name: 'alert.timestamp', type: 'date', required: true, description: 'Alert timestamp' },
        { name: 'alert.location', type: 'string', required: false, description: 'Alert location' },
        { name: 'alert.device', type: 'string', required: false, description: 'Alert device' },
      ],
      localization: {
        en: {
          subject: 'Security Alert: {{alert.type}}',
          content: `Hi {{user.firstName}},

We detected a security activity on your account:

{{alert.description}}

Details:
- Activity: {{alert.type}}
- Time: {{alert.timestamp}}
- Location: {{alert.location}}
- Device: {{alert.device}}

If this was you, no action is needed. If you don't recognize this activity, please secure your account immediately.

Security Team
StrellerMinds`,
        },
      },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Register templates
    this.registerTemplate(welcomeTemplate);
    this.registerTemplate(assignmentReminderTemplate);
    this.registerTemplate(gradeTemplate);
    this.registerTemplate(securityTemplate);
  }

  registerTemplate(template: Template): void {
    this.templates.set(template.id, template);
    this.compiledTemplates.delete(template.id); // Clear cache
    this.logger.debug(`Template registered: ${template.id}`);
  }

  getTemplate(templateId: string): Template | undefined {
    return this.templates.get(templateId);
  }

  getAllTemplates(): Template[] {
    return Array.from(this.templates.values());
  }

  getTemplatesByType(type: NotificationType): Template[] {
    return Array.from(this.templates.values()).filter(template => template.type === type);
  }

  getTemplatesByChannel(channel: NotificationChannel): Template[] {
    return Array.from(this.templates.values()).filter(template => 
      template.channels.includes(channel)
    );
  }

  async renderTemplate(
    templateId: string,
    context: TemplateRenderContext,
  ): Promise<{
    subject?: string;
    content: string;
    htmlContent?: string;
  }> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    if (!template.isActive) {
      throw new Error(`Template is not active: ${templateId}`);
    }

    const locale = context.locale || 'en';
    const localization = template.localization[locale] || template.localization.en;

    // Merge context data
    const renderData = {
      ...context.data,
      user: context.user || {},
      metadata: context.metadata || {},
    };

    // Render subject
    let subject: string | undefined;
    if (template.subject || localization.subject) {
      subject = this.renderString(
        localization.subject || template.subject || '',
        renderData,
      );
    }

    // Render content
    const content = this.renderString(localization.content, renderData);

    // Render HTML content if available
    let htmlContent: string | undefined;
    if (template.htmlContent || localization.htmlContent) {
      htmlContent = this.renderString(
        localization.htmlContent || template.htmlContent || '',
        renderData,
      );
    }

    return {
      subject,
      content,
      htmlContent,
    };
  }

  private renderString(template: string, data: Record<string, any>): string {
    // Simple template rendering using regex
    // In a production environment, you might want to use a more sophisticated templating engine
    // like Handlebars, Mustache, or a custom implementation

    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      try {
        const value = this.getNestedValue(data, path.trim());
        if (value === null || value === undefined) {
          this.logger.warn(`Template variable not found: ${path}`);
          return `[${path}]`;
        }
        return String(value);
      } catch (error) {
        this.logger.error(`Error rendering template variable ${path}: ${error.message}`);
        return `[${path}]`;
      }
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  async validateTemplate(template: Template): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required fields
    if (!template.id) {
      errors.push('Template ID is required');
    }

    if (!template.name) {
      errors.push('Template name is required');
    }

    if (!template.content) {
      errors.push('Template content is required');
    }

    // Validate variables
    const contentVariables = this.extractVariables(template.content);
    const subjectVariables = template.subject ? this.extractVariables(template.subject) : [];
    const htmlVariables = template.htmlContent ? this.extractVariables(template.htmlContent) : [];

    const allVariables = [...new Set([...contentVariables, ...subjectVariables, ...htmlVariables])];

    // Check for undefined variables
    const definedVariables = template.variables.map(v => v.name);
    const undefinedVariables = allVariables.filter(variable => 
      !definedVariables.includes(variable)
    );

    if (undefinedVariables.length > 0) {
      warnings.push(`Undefined variables found: ${undefinedVariables.join(', ')}`);
    }

    // Check for unused variables
    const unusedVariables = definedVariables.filter(variable => 
      !allVariables.includes(variable)
    );

    if (unusedVariables.length > 0) {
      warnings.push(`Unused variables found: ${unusedVariables.join(', ')}`);
    }

    // Validate required variables
    const requiredVariables = template.variables.filter(v => v.required).map(v => v.name);
    const missingRequiredVariables = requiredVariables.filter(variable => 
      !allVariables.includes(variable)
    );

    if (missingRequiredVariables.length > 0) {
      errors.push(`Missing required variables: ${missingRequiredVariables.join(', ')}`);
    }

    // Validate localization
    for (const [locale, localization] of Object.entries(template.localization)) {
      if (!localization.content) {
        errors.push(`Content is missing for locale: ${locale}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private extractVariables(template: string): string[] {
    const regex = /\{\{([^}]+)\}\}/g;
    const variables: string[] = [];
    let match;

    while ((match = regex.exec(template)) !== null) {
      variables.push(match[1].trim());
    }

    return [...new Set(variables)];
  }

  async createTemplate(templateData: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>): Promise<Template> {
    const template: Template = {
      ...templateData,
      id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const validation = await this.validateTemplate(template);
    if (!validation.isValid) {
      throw new Error(`Template validation failed: ${validation.errors.join(', ')}`);
    }

    this.registerTemplate(template);
    return template;
  }

  async updateTemplate(templateId: string, updates: Partial<Template>): Promise<Template> {
    const existingTemplate = this.templates.get(templateId);
    if (!existingTemplate) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const updatedTemplate: Template = {
      ...existingTemplate,
      ...updates,
      updatedAt: new Date(),
    };

    const validation = await this.validateTemplate(updatedTemplate);
    if (!validation.isValid) {
      throw new Error(`Template validation failed: ${validation.errors.join(', ')}`);
    }

    this.registerTemplate(updatedTemplate);
    return updatedTemplate;
  }

  async deleteTemplate(templateId: string): Promise<void> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    this.templates.delete(templateId);
    this.compiledTemplates.delete(templateId);
    this.logger.debug(`Template deleted: ${templateId}`);
  }

  async getTemplateStatistics(): Promise<any> {
    const templates = Array.from(this.templates.values());
    
    return {
      totalTemplates: templates.length,
      activeTemplates: templates.filter(t => t.isActive).length,
      templatesByType: this.groupBy(templates, 'type'),
      templatesByChannel: this.getChannelDistribution(templates),
      averageVariablesPerTemplate: templates.reduce((sum, t) => sum + t.variables.length, 0) / templates.length,
      localizationCoverage: this.calculateLocalizationCoverage(templates),
      generatedAt: new Date(),
    };
  }

  private groupBy<T>(array: T[], key: keyof T): Record<string, number> {
    return array.reduce((groups, item) => {
      const group = String(item[key]);
      groups[group] = (groups[group] || 0) + 1;
      return groups;
    }, {} as Record<string, number>);
  }

  private getChannelDistribution(templates: Template[]): Record<NotificationChannel, number> {
    const distribution = {} as Record<NotificationChannel, number>;
    
    for (const channel of Object.values(NotificationChannel)) {
      distribution[channel] = templates.filter(t => t.channels.includes(channel)).length;
    }
    
    return distribution;
  }

  private calculateLocalizationCoverage(templates: Template[]): any {
    const locales = new Set<string>();
    const templateLocales = new Map<string, Set<string>>();

    templates.forEach(template => {
      const templateLocaleSet = new Set(Object.keys(template.localization));
      templateLocales.set(template.id, templateLocaleSet);
      
      templateLocaleSet.forEach(locale => locales.add(locale));
    });

    const coverage: Record<string, number> = {};
    locales.forEach(locale => {
      coverage[locale] = Array.from(templateLocales.values()).filter(set => set.has(locale)).length;
    });

    return {
      totalLocales: locales.size,
      locales: Array.from(locales),
      coverage,
      averageLocalesPerTemplate: Array.from(templateLocales.values()).reduce((sum, set) => sum + set.size, 0) / templates.length,
    };
  }
}
