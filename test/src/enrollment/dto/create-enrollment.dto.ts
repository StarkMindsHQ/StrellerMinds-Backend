/**
 * DTO for creating a new enrollment.
 */
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateEnrollmentDto {
  /** Student ID */
  @ApiProperty({ description: 'Student ID', example: 'uuid-student' })
  @IsString()
  @IsNotEmpty()
  studentId: string;

  /** Course ID */
  @ApiProperty({ description: 'Course ID', example: 'uuid-course' })
  @IsString()
  @IsNotEmpty()
  courseId: string;
}
