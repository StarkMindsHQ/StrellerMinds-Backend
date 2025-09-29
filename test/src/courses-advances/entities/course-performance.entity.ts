import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CoursesAdvance } from './courses-advance.entity';

@Entity('course_performance')
export class CoursePerformance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('decimal', { precision: 10, scale: 2 })
  revenue: number;

  @Column({ default: 0 })
  totalStudents: number;

  @Column({ default: 0 })
  activeStudents: number;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  studentRetentionRate: number;

  @Column('decimal', { precision: 3, scale: 2, default: 0 })
  satisfactionScore: number;

  @Column('json', { nullable: true })
  topicPerformance: any;

  @Column('json', { nullable: true })
  quizResults: any;

  @ManyToOne(() => CoursesAdvance, (course) => course.analytics)
  @JoinColumn({ name: 'courseId' })
  course: CoursesAdvance;

  @Column()
  courseId: string;

  @CreateDateColumn()
  createdAt: Date;
}
