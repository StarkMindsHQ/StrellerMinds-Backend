import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, OneToMany } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { RefreshToken } from './refresh-token.entity';

export enum UserRole {
  ADMIN = 'admin',
  INSTRUCTOR = 'instructor',
  STUDENT = 'student',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
}

@Entity('users')
@Index(['email'])
export class User {
  @ApiProperty({ description: 'User unique identifier' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'User email address' })
  @Column({ unique: true })
  email: string;

  @ApiProperty({ description: 'User first name' })
  @Column()
  firstName: string;

  @ApiProperty({ description: 'User last name' })
  @Column()
  lastName: string;

  @ApiProperty({ description: 'Hashed password' })
  @Exclude()
  @Column()
  password: string;

  @ApiProperty({ description: 'User role', enum: UserRole })
  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.STUDENT,
  })
  role: UserRole;

  @ApiProperty({ description: 'User account status', enum: UserStatus })
  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.PENDING,
  })
  status: UserStatus;

  @ApiProperty({ description: 'Email verification status' })
  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ nullable: true })
  @Exclude()
  twoFactorAuthenticationSecret?: string;

  @Column({ default: false })
  isTwoFactorAuthenticationEnabled: boolean;

  @ApiProperty({ description: 'Email verification token' })
  @Column({ nullable: true })
  emailVerificationToken?: string;

  @ApiProperty({ description: 'Password reset token' })
  @Column({ nullable: true })
  passwordResetToken?: string;

  @ApiProperty({ description: 'Password reset token expiration' })
  @Column({ type: 'timestamp', nullable: true })
  passwordResetExpires?: Date;

  @ApiProperty({ description: 'Last login timestamp' })
  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt?: Date;

  @ApiProperty({ description: 'Account creation timestamp' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => RefreshToken, (token) => token.user)
  refreshTokens: RefreshToken[];

  @ApiProperty({ description: 'Full name', required: false })
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
