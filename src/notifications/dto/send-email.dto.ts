import { IsString, IsEmail, IsOptional, IsObject, IsEnum } from 'class-validator';
import { EmailTemplateType } from '../entities/email-template.entity';

export class SendEmailDto {
  @IsEmail()
  to: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsOptional()
  htmlContent?: string;

  @IsString()
  @IsOptional()
  textContent?: string;

  @IsEnum(EmailTemplateType)
  @IsOptional()
  templateType?: EmailTemplateType;

  @IsString()
  @IsOptional()
  templateId?: string;

  @IsObject()
  @IsOptional()
  templateData?: Record<string, any>;

  @IsString()
  @IsOptional()
  language?: string = 'en';

  @IsOptional()
  scheduleAt?: Date;

  @IsObject()
  @IsOptional()
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer;
    contentType?: string;
  }>;
}