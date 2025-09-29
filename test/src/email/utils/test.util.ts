import { Injectable } from '@nestjs/common';
import { EmailService } from '../email.service';

@Injectable()
export class EmailTestService {
  constructor(private readonly emailService: EmailService) {}

  async testTemplate(
    templateName: string,
    testEmail: string,
    context: Record<string, any>,
  ): Promise<boolean> {
    return this.emailService.sendEmail({
      to: testEmail,
      subject: `TEST: ${templateName}`,
      templateName,
      context,
      // Add a header to indicate this is a test email
      skipTracking: true,
    });
  }

  async validateTemplate(
    templateName: string,
    context: Record<string, any>,
  ): Promise<{ valid: boolean; errors?: string[] }> {
    try {
      // Get the template and try to compile it with the provided context
      const template = await this.emailService.getTemplate(templateName);
      const handlebars = require('handlebars');
      handlebars.compile(template)(context);

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        errors: [error.message],
      };
    }
  }

  async generatePreview(
    templateName: string,
    context: Record<string, any>,
  ): Promise<string> {
    try {
      // Get the template and compile it with the provided context
      const template = await this.emailService.getTemplate(templateName);
      const handlebars = require('handlebars');
      const compiledTemplate = handlebars.compile(template);

      return compiledTemplate(context);
    } catch (error) {
      return `<div style="color: red; padding: 20px; border: 1px solid red;">
        <h3>Error Rendering Template</h3>
        <p>${error.message}</p>
      </div>`;
    }
  }
}
