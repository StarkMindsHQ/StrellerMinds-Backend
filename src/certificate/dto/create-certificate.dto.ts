import { IsString, IsNotEmpty, IsDateString, IsOptional, IsUUID } from 'class-validator';

export class CreateCertificateDto {
  @IsString()
  @IsNotEmpty()
  certificateNumber: string;

  @IsDateString()
  issueDate: Date;

  @IsOptional()
  @IsString()
  pdfUrl?: string;

  @IsUUID()
  userId: string;

  @IsUUID()
  courseId: string;
}
