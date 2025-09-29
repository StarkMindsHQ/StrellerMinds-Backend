import { User } from 'src/users/entities/user.entity';
import {
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CourseVersion } from './course-version.entity';
import { CourseAnalytics } from './course-analytics.entity';

export class CoursesAdvance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  title: string;

  @Column('text')
  description: string;

  @Column({ length: 100 })
  category: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column({ default: 'draft' })
  status: 'draft' | 'published' | 'archived';

  @Column({ default: 'beginner' })
  level: 'beginner' | 'intermediate' | 'advanced';

  @Column({ default: 0 })
  duration: number; // in minutes

  @Column('json', { nullable: true })
  tags: string[];

  @Column('json', { nullable: true })
  requirements: string[];

  @Column('json', { nullable: true })
  learningOutcomes: string[];

  @Column({ nullable: true })
  thumbnailUrl: string;

  @Column({ nullable: true })
  videoUrl: string;

  @Column({ default: 0 })
  enrollmentCount: number;

  @Column('decimal', { precision: 3, scale: 2, default: 0 })
  averageRating: number;

  @Column({ default: 0 })
  totalReviews: number;

  @ManyToOne(() => User, (user) => user.courses)
  @JoinColumn({ name: 'instructorId' })
  instructor: User;

  @Column()
  instructorId: string;

  @OneToMany(() => CourseVersion, (version) => version.course)
  versions: CourseVersion[];

  @OneToMany(() => CourseAnalytics, (analytics) => analytics.course)
  analytics: CourseAnalytics[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
