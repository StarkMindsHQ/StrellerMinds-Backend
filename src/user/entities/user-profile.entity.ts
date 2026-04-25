import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

/**
 * Indexes:
 *  - userId → unique FK; profile is always fetched by owner userId
 */
@Index('IDX_user_profile_userId', ['userId'], { unique: true })
@Index('IDX_user_profile_createdAt', ['createdAt'])
@Index('IDX_user_profile_updatedAt', ['updatedAt'])
@Entity('user_profiles')
export class UserProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** One-to-one FK to users.id; unique constraint enforced at DB level */
  @Column({ unique: true })
  userId: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  bio: string;

  @Column({ nullable: true })
  avatar: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
