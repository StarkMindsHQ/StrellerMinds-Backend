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
 *  - email        → unique B-tree (login lookups, duplicate-check on register)
 *  - isActive     → partial-index candidate; used in user-status filters
 *  - createdAt    → range scans for admin dashboards / reporting
 */
@Index('IDX_user_email', ['email'], { unique: true })
@Index('IDX_user_isActive', ['isActive'])
@Index('IDX_user_createdAt', ['createdAt'])
@Index('IDX_user_updatedAt', ['updatedAt'])
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Unique index defined both via @Column unique:true (DDL constraint)
   *  and the composite @Index above so TypeORM names it predictably. */
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
