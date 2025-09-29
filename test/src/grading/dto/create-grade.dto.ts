/**
 * DTO for creating a new grade.
 */
import { IsNumber, IsString, IsNotEmpty, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateGradeDto {
  /** Numeric grade between 0 and 100. */
  @ApiProperty({ example: 85, description: 'Numeric grade between 0 and 100.' })
  @IsNumber()
  @Min(0)
  @Max(100)
  numericGrade: number;

  /** Feedback for the student. */
  @ApiProperty({
    example: 'Great understanding of the subject.',
    description: 'Feedback for the student.',
  })
  @IsString()
  @IsNotEmpty()
  feedback: string;
}
