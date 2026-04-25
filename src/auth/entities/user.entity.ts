import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { RefreshToken } from './refresh-token.entity';
import { Role } from '../enums/role.enum';

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

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ type: 'enum', enum: Role, default: Role.Student })
  role: Role;

  @Column({ nullable: true, select: false })
  mfaSecret: string;

  @Column({ default: false })
  mfaEnabled: boolean;

  @Column({ nullable: true, select: false })
  passwordResetToken: string;

  @Column({ type: 'timestamptz', nullable: true, select: false })
  passwordResetExpires: Date;

  @OneToMany(() => RefreshToken, (token) => token.user, { cascade: ['remove'] })
  refreshTokens: RefreshToken[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
