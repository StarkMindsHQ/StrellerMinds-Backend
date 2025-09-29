import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from '../enums/userRole.enum';
import { AccountStatus } from '../enums/accountStatus.enum';

@Entity('archived_users')
export class ArchivedUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  isInstructor: boolean;

  @Column({ nullable: true, type: 'text' })
  bio: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.STUDENT })
  role: UserRole;

  @Column({ nullable: true })
  profileImageUrl?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'enum', enum: AccountStatus, default: AccountStatus.ACTIVE })
  status: AccountStatus;

  @Column({ nullable: true })
  deactivatedAt: Date;

  @Column({ nullable: true })
  deletionRequestedAt: Date;

  @Column({ nullable: true })
  deletedAt: Date;

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ nullable: true })
  refreshToken?: string;

  @Column()
  archivedAt: Date;
}
