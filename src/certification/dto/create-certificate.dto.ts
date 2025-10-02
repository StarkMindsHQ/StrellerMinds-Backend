import { IsString, IsUUID, IsOptional, IsNumber, IsObject, Min, Max } from 'class-validator';

export class CreateCertificateDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  certificationTypeId: string;

  @IsString()
  recipientName: string;

  @IsString()
  recipientEmail: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  score?: number;

  @IsOptional()
  @IsObject()
  metadata?: {
    courseId?: string;
    courseName?: string;
    instructorName?: string;
    completionDate?: Date;
    assessmentResults?: any[];
    skillsValidated?: string[];
    additionalInfo?: Record<string, any>;
  };

  @IsOptional()
  @IsUUID()
  issuedBy?: string;
}
