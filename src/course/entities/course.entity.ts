import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToMany,
  ManyToOne,
  JoinTable,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  Check,
} from 'typeorm';
import { CourseStatus } from '../enums/course-status.enum';
import { CourseModule } from './module.entity';
import { CourseVersion } from './course-version.entity';
import { Category } from './category.entity';
import { Tag } from './tag.entity';
import { User } from '../../auth/entities/user.entity';

@Entity('courses')
@Index(['status', 'createdAt'])
@Index(['instructorId'])
@Index(['publishedAt'])
@Check(`"durationMinutes" >= 0`)
export class Course {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  subtitle: string;

  @Column({ type: 'text' })
  description: string;

  @Column()
  level: string;

  @Column()
  language: string;

  @Column({ default: 0 })
  durationMinutes: number;

  @Column({ type: 'enum', enum: CourseStatus, default: CourseStatus.DRAFT })
  @Index()
  status: CourseStatus;

  @Column({ type: 'uuid', nullable: true })
  instructorId: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'instructorId' })
  instructor: User;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: number;

  @Column({ default: 'USD' })
  currency: string;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt: Date;

  @OneToMany(() => CourseModule, (module) => module.course, {
    cascade: true,
  })
  modules: CourseModule[];

  @OneToMany(() => CourseVersion, (version) => version.course)
  versions: CourseVersion[];

  @ManyToMany(() => Category)
  @JoinTable({
    name: 'course_categories',
    joinColumn: { name: 'courseId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'categoryId', referencedColumnName: 'id' },
  })
  categories: Category[];

  @ManyToMany(() => Tag)
  @JoinTable({
    name: 'course_tags',
    joinColumn: { name: 'courseId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tagId', referencedColumnName: 'id' },
  })
  tags: Tag[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
