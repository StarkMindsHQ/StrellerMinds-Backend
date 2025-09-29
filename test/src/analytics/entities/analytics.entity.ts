import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Analytics entity representing analytics events and records.
 */
@Entity('analytics')
export class Analytics {
  @ApiProperty({ description: 'Analytics record ID', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Event type', example: 'course_view' })
  @Index() // Optimized for querying analytics by event type
  @Column()
  eventType: string; // e.g., "course_view", "lesson_completed"

  @ApiProperty({ description: 'User ID', example: 123 })
  @Index() // Indexing improves search performance for user-based analytics
  @Column()
  userId: number;

  @ApiPropertyOptional({ description: 'Course ID (optional)', example: 456 })
  @Column({ nullable: true })
  courseId?: number; // Optional for course-related events

  @ApiPropertyOptional({ description: 'Additional event data (optional)', type: 'object' })
  @Column({ type: 'json', nullable: true })
  additionalData?: Record<string, any>; // Properly stored as JSON

  @ApiProperty({ description: 'Event creation date', example: '2025-06-28T12:00:00Z' })
  @CreateDateColumn()
  createdAt: Date;
}
