// src/submission/dto/create-submission.dto.ts
import { IsNotEmpty, IsOptional, IsUUID, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for creating a new submission.
 */
export class CreateSubmissionDto {
  /** Student ID */
  @ApiProperty({ description: 'Student ID', example: 'uuid-student' })
  @IsUUID()
  studentId: string;

  /** Assignment ID */
  @ApiProperty({ description: 'Assignment ID', example: 'uuid-assignment' })
  @IsUUID()
  assignmentId: string;

  /** Text content of the submission */
  @ApiPropertyOptional({ description: 'Text content of the submission', example: 'My answer...' })
  @IsOptional()
  @IsString()
  textContent?: string;
}
