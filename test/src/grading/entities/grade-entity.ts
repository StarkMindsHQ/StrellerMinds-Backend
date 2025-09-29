import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from 'src/users/entities/user.entity';
import { Assignment } from 'src/assignment/entities/assignment.entity';

/**
 * Entity representing a grade record.
 */
@Entity()
export class Grade {
  /** Grade ID */
  @ApiProperty({ description: 'Grade ID', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  /** Mentor (user who graded) */
  @ApiProperty({ description: 'Mentor (user who graded)' })
  @ManyToOne(() => User, (user) => user.gradesGiven)
  mentor: User;

  /** Student (user who was graded) */
  @ApiProperty({ description: 'Student (user who was graded)' })
  @ManyToOne(() => User, (user) => user.gradesReceived)
  student: User;

  /** Assignment */
  @ApiProperty({ description: 'Assignment' })
  @ManyToOne(() => Assignment)
  assignment: Assignment;

  /** Numeric grade */
  @ApiProperty({ description: 'Numeric grade', example: 85 })
  @Column({ type: 'int' })
  numericGrade: number;

  /** Feedback for the student */
  @ApiProperty({ description: 'Feedback for the student', example: 'Great job!' })
  @Column({ type: 'text' })
  feedback: string;

  /** Date/time when the grade was created */
  @ApiProperty({ description: 'Date/time when the grade was created', type: String, format: 'date-time', example: '2025-06-29T12:00:00Z' })
  @CreateDateColumn()
  createdAt: Date;

  /** Date/time when the grade was last updated */
  @ApiProperty({ description: 'Date/time when the grade was last updated', type: String, format: 'date-time', example: '2025-06-29T12:10:00Z' })
  @UpdateDateColumn()
  updatedAt: Date;
}
