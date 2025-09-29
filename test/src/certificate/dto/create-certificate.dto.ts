/**
 * DTO for creating a new certificate.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsDateString, IsOptional, IsUUID } from 'class-validator';

export class CreateCertificateDto {
  @ApiProperty({ description: 'Certificate number', example: 'CERT-2025-001' })
  @IsString()
  @IsNotEmpty()
  certificateNumber: string;

  @ApiProperty({ description: 'Issue date', example: '2025-06-29' })
  @IsDateString()
  issueDate: Date;

  @ApiPropertyOptional({ description: 'PDF URL', example: 'https://cdn.com/cert.pdf' })
  @IsOptional()
  @IsString()
  pdfUrl?: string;

  @ApiProperty({ description: 'User ID', example: 'uuid-user' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Course ID', example: 'uuid-course' })
  @IsUUID()
  courseId: string;
}
