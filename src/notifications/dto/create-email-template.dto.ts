import { IsString, IsEnum, IsBoolean, IsOptional, IsObject, IsEmail } from 'class-validator';
import { EmailTemplateType } from '../entities/email-template.entity';

export class CreateEmailTemplateDto {
  @IsString()
  name: string;

  @IsEnum(EmailTemplateType)
  type: EmailTemplateType;

  @IsString()
  subject: string;

  @IsString()
  htmlContent: string;

  @IsString()
  @IsOptional()
  textContent?: string;

  @IsObject()
  @IsOptional()
  placeholders?: Record<string, string>;

  @IsObject()
  @IsOptional()
  languages?: Record<string, {
    subject: string;
    htmlContent: string;
    textContent?: string;
  }>;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}