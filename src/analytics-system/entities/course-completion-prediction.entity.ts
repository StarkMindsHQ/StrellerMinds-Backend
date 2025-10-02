import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Course } from '../../courses/entities/course.entity';

@Entity('course_completion_predictions')
@Index(['userId', 'courseId'])
export class CourseCompletionPrediction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  courseId: string;

  @Column({ type: 'float' })
  completionLikelihood: number; // A value between 0 and 1

  @Column({ type: 'timestamp', nullable: true })
  predictedCompletionDate: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  factors: Record<string, any> | null; // Factors considered for prediction (e.g., time spent, progress, past performance)

  @CreateDateColumn({ type: 'timestamp' })
  predictionDate: Date;

  @ManyToOne(() => User, (user) => user.completionPredictions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Course, (course) => course.completionPredictions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course: Course;
}
