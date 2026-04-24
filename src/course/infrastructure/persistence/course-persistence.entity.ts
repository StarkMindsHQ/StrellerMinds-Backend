import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Course Persistence Entity
 * Database representation of a course
 * Separate from domain entity to maintain clean architecture
 */
@Index('IDX_course_persistence_isActive', ['isActive'])
@Index('IDX_course_persistence_createdAt', ['createdAt'])
@Index('IDX_course_persistence_updatedAt', ['updatedAt'])
@Index('IDX_course_persistence_title', ['title'])
@Index('IDX_course_persistence_category', ['category'])
@Index('IDX_course_persistence_difficulty', ['difficulty'])
@Entity('courses')
export class CoursePersistenceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  category: string;

  @Column({ nullable: true })
  difficulty: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
