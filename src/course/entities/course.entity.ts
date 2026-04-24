import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Indexes:
 *  - isActive  → most listing queries filter by active status
 *  - createdAt → ordering / pagination of course listings
 *  - title     → full-text search candidacy; basic B-tree for exact/prefix lookups
 */
@Index('IDX_course_isActive', ['isActive'])
@Index('IDX_course_createdAt', ['createdAt'])
@Index('IDX_course_updatedAt', ['updatedAt'])
@Index('IDX_course_title', ['title'])
@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
