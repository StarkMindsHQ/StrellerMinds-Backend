import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CoursesAdvance } from './courses-advance.entity';

@Entity('course_versions')
export class CourseVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  version: string; // e.g., "1.0.0", "1.1.0"

  @Column('text')
  changeLog: string;

  @Column('json')
  content: any; // Course content snapshot

  @Column({ default: false })
  isActive: boolean;

  @Column({ default: false })
  isPublished: boolean;

  @ManyToOne(() => CoursesAdvance, (course) => course.versions)
  @JoinColumn({ name: 'courseId' })
  course: CoursesAdvance;

  @Column()
  courseId: string;

  @CreateDateColumn()
  createdAt: Date;
}
