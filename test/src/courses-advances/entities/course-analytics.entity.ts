import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CoursesAdvance } from './courses-advance.entity';

@Entity('course_analytics')
export class CourseAnalytics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ default: 0 })
  views: number;

  @Column({ default: 0 })
  enrollments: number;

  @Column({ default: 0 })
  completions: number;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  completionRate: number;

  @Column({ default: 0 })
  averageWatchTime: number; // in minutes

  @Column({ default: 0 })
  dropOffRate: number;

  @Column('json', { nullable: true })
  engagementMetrics: any;

  @ManyToOne(() => CoursesAdvance, (course) => course.analytics)
  @JoinColumn({ name: 'courseId' })
  course: CoursesAdvance;

  @Column()
  courseId: string;

  @CreateDateColumn()
  createdAt: Date;
}
