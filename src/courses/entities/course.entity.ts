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
// FIX: Changed absolute path to relative path
import { Lesson } from '../../lesson/entity/lesson.entity';

@Entity('courses')
export class Course {
  @ApiProperty({ description: 'Course ID', example: 'uuid-v4' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ description: 'Course title', example: 'Introduction to Blockchain' })
  @Column({ length: 255 })
  title!: string;

  @ApiProperty({ description: 'Course description', example: 'Learn the basics of blockchain technology.' })
  @Column({ type: 'text' })
  description!: string;

  @ApiProperty({ description: 'Course price', example: 99.99 })
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price!: number;

  @ApiProperty({ description: 'Course duration in hours', example: 10 })
  @Column({ default: 0 })
  durationInHours!: number;

  @ApiProperty({ description: 'Course status', example: 'draft' })
  @Column({ default: 'draft' })
  status!: string; // draft, published, archived

  @Column({ nullable: true })
  thumbnail?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => User, (user) => user.id, { nullable: false })
  @Index()
  instructor!: Promise<User>;

  @ManyToOne(() => Category, (category) => category.courses, {
    nullable: false,
  })
  @Index()
  category!: Promise<Category>;

  @OneToMany(() => CourseModule, (module) => module.course, { cascade: true })
  modules!: Promise<CourseModule[]>;

  @OneToMany(() => Certificate, (certificate) => certificate.course)
  certificates!: Promise<Certificate[]>;

  @OneToMany(() => CourseReview, (review) => review.course)
  reviews!: Promise<CourseReview[]>;

  @OneToMany(() => UserProgress, (progress) => progress.course)
  userProgress!: Promise<UserProgress[]>;

  @ManyToMany(() => Tag, (tag) => tag.courses)
  @JoinTable({
    name: 'course_tags',
    joinColumn: { name: 'course_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tag_id', referencedColumnName: 'id' },
  })
  tags!: Promise<Tag[]>;

  @OneToMany(() => Lesson, (lesson) => lesson.course)
  lessons!: Lesson[];
}