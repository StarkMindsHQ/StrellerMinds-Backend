import { IsString, IsEnum, IsBoolean, IsOptional, IsObject } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { CreateEmailTemplateDto } from './create-email-template.dto';
import { EmailTemplateType } from '../entities/email-template.entity';

export class UpdateEmailTemplateDto extends PartialType(CreateEmailTemplateDto) {
  @IsEnum(EmailTemplateType)
  @IsOptional()
  type?: EmailTemplateType;

  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsOptional()
  htmlContent?: string;

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
  isActive?: boolean;
}