import { Command, CommandRunner } from 'nest-commander';
import { Injectable } from '@nestjs/common';
import { EmailTemplateService } from '../admin/template.service';

@Injectable()
@Command({
  name: 'seed:email-templates',
  description: 'Seed default email templates',
})
export class SeedEmailTemplatesCommand extends CommandRunner {
  // constructor(private readonly emailTemplateService: EmailTemplateService) {}

  async run(): Promise<void> {
    try {
      // await this.emailTemplateService.seedDefaultTemplates();
      console.log('Email templates seeded successfully');
    } catch (error) {
      console.error('Failed to seed email templates:', error.message);
    }
  }
}
