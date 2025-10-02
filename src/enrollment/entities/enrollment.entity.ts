// src/enrollment/entities/enrollment.entity.ts
import { ApiProperty } from '@nestjs/swagger';

/**
 * Entity representing an enrollment record.
 */
export class Enrollment {
  /** Enrollment ID */
  @ApiProperty({ description: 'Enrollment ID', example: 'uuid-enrollment' })
  id: string;

  /** Student ID */
  @ApiProperty({ description: 'Student ID', example: 'uuid-student' })
  studentId: string;

  /** Course ID */
  @ApiProperty({ description: 'Course ID', example: 'uuid-course' })
  courseId: string;

  /** Date/time when enrolled */
  @ApiProperty({
    description: 'Date/time when enrolled',
    type: String,
    format: 'date-time',
    example: '2025-06-29T12:00:00Z',
  })
  enrolledAt: Date;

  /** Enrollment status */
  @ApiProperty({
    enum: ['ENROLLED', 'UNENROLLED'],
    description: 'Enrollment status',
    example: 'ENROLLED',
  })
  status: 'ENROLLED' | 'UNENROLLED';

  /** Payment status (optional) */
  @ApiProperty({
    enum: ['PENDING', 'PAID'],
    required: false,
    description: 'Payment status',
    example: 'PAID',
  })
  paymentStatus?: 'PENDING' | 'PAID';
}
