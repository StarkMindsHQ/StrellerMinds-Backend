import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * User Persistence Entity
 * This is the database representation of a user
 * It is separate from the domain User entity to maintain clean architecture
 * Indexes are optimized for common queries
 */
@Index('IDX_user_persistence_email', ['email'], { unique: true })
@Index('IDX_user_persistence_isActive', ['isActive'])
@Index('IDX_user_persistence_createdAt', ['createdAt'])
@Index('IDX_user_persistence_updatedAt', ['updatedAt'])
@Entity('users')
export class UserPersistenceEntity {
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
