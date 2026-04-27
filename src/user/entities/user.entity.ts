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
 *  - email    → unique B-tree (login lookups, duplicate-check on register)
 *  - isActive → user-status filter used in admin/listing queries
 *  - createdAt → range scans for reporting dashboards
 */
@Index('IDX_user_email', ['email'], { unique: true })
@Index('IDX_user_isActive', ['isActive'])
@Index('IDX_user_createdAt', ['createdAt'])
@Index('IDX_user_updatedAt', ['updatedAt'])
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
