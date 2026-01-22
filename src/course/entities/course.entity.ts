import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CourseStatus } from '../enums/course-status.enum';
import { CourseModule } from './module.entity';
import { CourseVersion } from './course-version.entity';
import { Category } from './category.entity';
import { Tag } from './tag.entity';



@Entity()
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
  status: CourseStatus;

  @OneToMany(() => CourseModule, (module) => module.course, {
    cascade: true,
  })
  modules: CourseModule[];

  @OneToMany(() => CourseVersion, (version) => version.course)
  versions: CourseVersion[];

  @ManyToMany(() => Category)
  @JoinTable()
  categories: Category[];

  @ManyToMany(() => Tag)
  @JoinTable()
  tags: Tag[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
