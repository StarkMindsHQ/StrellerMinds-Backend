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
 *  - instructorId → for sharding operations
 *  - shardKey → for sharding operations
 */
@Index('IDX_course_isActive', ['isActive'])
@Index('IDX_course_createdAt', ['createdAt'])
@Index('IDX_course_updatedAt', ['updatedAt'])
@Index('IDX_course_title', ['title'])
@Index('IDX_course_instructorId', ['instructorId'])
@Index('IDX_course_shardKey', ['shardKey'])
@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  instructorId: string; // Used for sharding - ID of the course instructor

  @Column({ nullable: true })
  shardKey: string; // Used for sharding - will be set to instructorId or id

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper method to get shard key
  getShardKey(): string {
    return this.shardKey || this.instructorId || this.id;
  }

  // Helper method to set shard key
  setShardKey(): void {
    this.shardKey = this.instructorId || this.id;
  }
}
