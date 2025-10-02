import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinTable,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Category } from './category.entity';
import { Tag } from './tag.entity';
import { CourseReview } from './course-review.entity';
import { User } from '../../users/entities/user.entity';
import { CourseModule } from './course-module.entity';
import { Certificate } from '../../certificate/entity/certificate.entity';
import { UserProgress } from '../../users/entities/user-progress.entity';
import { Lesson } from 'src/lesson/entity/lesson.entity';
import { SubscriptionPlan } from '../../payment/entities/subscription.entity';

@Entity('courses')
export class Course {
  /**
   * Course entity representing a course in the platform.
   */

  @ApiProperty({ description: 'Course ID', example: 'uuid-v4' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Course title', example: 'Introduction to Blockchain' })
  @Column({ length: 255 })
  title: string;

  @ApiProperty({
    description: 'Course description',
    example: 'Learn the basics of blockchain technology.',
  })
  @Column({ type: 'text' })
  description: string;

  @ApiProperty({ description: 'Course price', example: 99.99 })
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: number;

  @ApiProperty({ description: 'Course duration in hours', example: 10 })
  @Column({ default: 0 })
  durationInHours: number;

  @ApiProperty({ description: 'Course status', example: 'draft' })
  @Column({ default: 'draft' })
  status: string; // draft, published, archived

  @Column({ nullable: true })
  thumbnail: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Marks course as premium gated content', example: true })
  @Column({ type: 'boolean', default: false })
  isPremium: boolean;

  @ApiPropertyOptional({
    description: 'Minimum subscription plan required to access',
    enum: SubscriptionPlan,
  })
  @Column({ type: 'enum', enum: SubscriptionPlan, nullable: true })
  requiredPlan?: SubscriptionPlan | null;

  // Many-to-One relationships
  @ManyToOne(() => User, (user) => user.id, { nullable: false })
  @Index()
  instructor: Promise<User>;

  @ManyToOne(() => Category, (category) => category.courses, {
    nullable: false,
  })
  @Index()
  category: Promise<Category>;

  // One-to-Many relationships
  @OneToMany(() => CourseModule, (module) => module.course, { cascade: true })
  modules: Promise<CourseModule[]>;

  @OneToMany(() => Certificate, (certificate) => certificate.course)
  certificates: Promise<Certificate[]>;

  @OneToMany(() => CourseReview, (review) => review.course)
  reviews: Promise<CourseReview[]>;

  @OneToMany(() => UserProgress, (progress) => progress.course)
  userProgress: Promise<UserProgress[]>;

  // Many-to-Many relationship
  @ManyToMany(() => Tag, (tag) => tag.courses)
  @JoinTable({
    name: 'course_tags',
    joinColumn: { name: 'course_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tag_id', referencedColumnName: 'id' },
  })
  tags: Promise<Tag[]>;

  @OneToMany(() => Lesson, (lesson) => lesson.course)
  lessons: Lesson[];
}
