import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Entity representing a user's progress on a lesson.
 */
@Entity()
export class Progress {
    /** Unique progress record ID */
    @ApiProperty({ description: 'Unique progress record ID', example: 1 })
    @PrimaryGeneratedColumn()
    id: number;

    /** User ID */
    @ApiProperty({ description: 'User ID', example: 123 })
    @Column()
    userId: number;

    /** Lesson ID */
    @ApiProperty({ description: 'Lesson ID', example: 456 })
    @Column()
    lessonId: number;

    /** Whether the lesson is completed */
    @ApiProperty({ description: 'Whether the lesson is completed', example: true })
    @Column({ default: false })
    completed: boolean;

    /** Score for the lesson (if applicable) */
    @ApiProperty({ description: 'Score for the lesson', required: false, example: 95.5 })
    @Column({ type: 'float', nullable: true })
    score: number;

    /** Time spent on the lesson in seconds */
    @ApiProperty({ description: 'Time spent on the lesson in seconds', required: false, example: 1200 })
    @Column({ type: 'int', nullable: true })
    timeSpent: number; // in seconds

    /** Last update timestamp */
    @ApiProperty({ description: 'Last update timestamp' })
    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    updatedAt: Date;
}