import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailTemplate, EmailTemplateType } from '../entities/email-template.entity';
import { CreateEmailTemplateDto } from '../dto/create-email-template.dto';
import { UpdateEmailTemplateDto } from '../dto/update-email-template.dto';

@Injectable()
export class TemplateService {
  constructor(
    @InjectRepository(EmailTemplate)
    private templateRepository: Repository<EmailTemplate>,
  ) {}

  async createTemplate(createTemplateDto: CreateEmailTemplateDto): Promise<EmailTemplate> {
    const template = new EmailTemplate();
    Object.assign(template, createTemplateDto);
    return await this.templateRepository.save(template);
  }

  async updateTemplate(
    id: string,
    updateTemplateDto: UpdateEmailTemplateDto,
  ): Promise<EmailTemplate> {
    const template = await this.templateRepository.findOne({ where: { id } });
    if (!template) {
      throw new Error(`Template with ID ${id} not found`);
    }

    Object.assign(template, updateTemplateDto);
    return await this.templateRepository.save(template);
  }

  async getTemplateById(id: string): Promise<EmailTemplate> {
    return await this.templateRepository.findOne({ where: { id } });
  }

  async getTemplateByType(type: EmailTemplateType): Promise<EmailTemplate> {
    return await this.templateRepository.findOne({ where: { type, isActive: true } });
  }

  async getAllTemplates(): Promise<EmailTemplate[]> {
    return await this.templateRepository.find();
  }

  async deleteTemplate(id: string): Promise<void> {
    await this.templateRepository.delete(id);
  }

  async getTemplateForLanguage(
    templateId: string,
    language: string,
  ): Promise<{ subject: string; htmlContent: string; textContent?: string }> {
    const template = await this.templateRepository.findOne({ where: { id: templateId } });

    if (!template) {
      throw new Error(`Template with ID ${templateId} not found`);
    }

    // If the language exists in the template's languages, return the localized version
    if (template.languages && template.languages[language]) {
      return template.languages[language];
    }

    // Otherwise, return the default template
    return {
      subject: template.subject,
      htmlContent: template.htmlContent,
      textContent: template.textContent,
    };
  }

  async addLanguageToTemplate(
    templateId: string,
    language: string,
    content: { subject: string; htmlContent: string; textContent?: string },
  ): Promise<EmailTemplate> {
    const template = await this.templateRepository.findOne({ where: { id: templateId } });

    if (!template) {
      throw new Error(`Template with ID ${templateId} not found`);
    }

    if (!template.languages) {
      template.languages = {};
    }

    template.languages[language] = content;
    return await this.templateRepository.save(template);
  }
}
