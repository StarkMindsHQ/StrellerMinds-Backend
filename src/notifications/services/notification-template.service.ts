import { Injectable } from '@nestjs/common';
import { NotificationType } from '../entities/notification.entity';
import { NotificationTemplate } from '../templates/notification-templates';

@Injectable()
export class NotificationTemplateService {
  private customTemplates: Map<string, NotificationTemplate> = new Map();

  addCustomTemplate(key: string, template: NotificationTemplate): void {
    this.customTemplates.set(key, template);
  }

  getCustomTemplate(key: string): NotificationTemplate | undefined {
    return this.customTemplates.get(key);
  }

  removeCustomTemplate(key: string): boolean {
    return this.customTemplates.delete(key);
  }

  getAllCustomTemplates(): Record<string, NotificationTemplate> {
    return Object.fromEntries(this.customTemplates);
  }

  validateTemplate(template: NotificationTemplate): boolean {
    return !!(template.title && template.body);
  }

  renderTemplate(template: NotificationTemplate, variables: Record<string, any>): NotificationTemplate {
    return {
      title: this.replaceVariables(template.title, variables),
      body: this.replaceVariables(template.body, variables),
      imageUrl: template.imageUrl ? this.replaceVariables(template.imageUrl, variables) : undefined,
      clickAction: template.clickAction ? this.replaceVariables(template.clickAction, variables) : undefined,
      data: template.data
    };
  }

  private replaceVariables(text: string, variables: Record<string, any>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key]?.toString() || match;
    });
  }
}
