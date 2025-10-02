import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  OneToOne,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  JoinColumn,
  Check,
  Unique,
} from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserProgress } from '../../users/entities/user-progress.entity';
import { WalletInfo } from '../../users/entities/wallet-info.entity';
import { UserRole } from '../../users/enums/userRole.enum';
import { AccountStatus } from '../../users/enums/accountStatus.enum';
import { AuthToken } from '../../auth/entities/auth-token.entity';
import { Course } from '../../courses/entities/course.entity';
import { CourseReview } from '../../courses/entities/course-review.entity';
import { Certificate } from '../../certificate/entity/certificate.entity';
import { UserProfile } from '../../users/entities/user-profile.entity';
import { UserSettings } from '../../users/entities/user-settings.entity';

/**
 * Optimized User entity with proper constraints, indexes, and relationships
 */
@Entity('users')
@Index('IDX_users_email', ['email'])
@Index('IDX_users_username', ['username'])
@Index('IDX_users_role_status', ['role', 'status'])
@Index('IDX_users_created_at', ['createdAt'])
@Index('IDX_users_instructor_status', ['isInstructor', 'status'])
@Unique('UQ_users_email', ['email'])
@Unique('UQ_users_username', ['username'])
@Check('CHK_users_email_format', "email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'")
@Check('CHK_users_name_length', 'LENGTH(firstName) >= 1 AND LENGTH(lastName) >= 1')
export class OptimizedUser {
  @ApiProperty({
    description: 'Unique user ID',
    example: 'uuid-v4',
    format: 'uuid',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'First name',
    example: 'John',
    minLength: 1,
    maxLength: 100,
  })
  @Column({
    type: 'varchar',
    length: 100,
    nullable: false,
    comment: 'User first name',
  })
  firstName: string;

  @ApiProperty({
    description: 'Last name',
    example: 'Doe',
    minLength: 1,
    maxLength: 100,
  })
  @Column({
    type: 'varchar',
    length: 100,
    nullable: false,
    comment: 'User last name',
  })
  lastName: string;

  @ApiProperty({
    description: 'Email address',
    example: 'user@example.com',
    format: 'email',
  })
  @Column({
    type: 'varchar',
    length: 255,
    unique: true,
    nullable: false,
    comment: 'User email address - must be unique',
  })
  @Index('IDX_users_email_unique')
  email: string;

  @ApiProperty({
    description: 'Username',
    example: 'johndoe',
    minLength: 3,
    maxLength: 50,
  })
  @Column({
    type: 'varchar',
    length: 50,
    unique: true,
    nullable: false,
    comment: 'Unique username for the user',
  })
  @Index('IDX_users_username_unique')
  username: string;

  @ApiProperty({
    description: 'Password hash',
    writeOnly: true,
  })
  @Column({
    type: 'varchar',
    length: 255,
    select: false,
    nullable: false,
    comment: 'Hashed password - never returned in API responses',
  })
  password: string;

  @ApiProperty({
    description: 'Is user an instructor',
    example: false,
  })
  @Column({
    type: 'boolean',
    default: false,
    nullable: false,
    comment: 'Whether the user has instructor privileges',
  })
  @Index('IDX_users_is_instructor')
  isInstructor: boolean;

  @ApiPropertyOptional({
    description: 'User biography',
    example: 'A passionate learner',
    maxLength: 1000,
  })
  @Column({
    type: 'varchar',
    length: 1000,
    nullable: true,
    comment: 'User biography or description',
  })
  bio: string;

  @ApiProperty({
    enum: UserRole,
    description: 'User role',
    example: UserRole.STUDENT,
  })
  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.STUDENT,
    nullable: false,
    comment: 'User role in the system',
  })
  @Index('IDX_users_role')
  role: UserRole;

  @ApiPropertyOptional({
    description: 'Profile image URL',
    example: 'https://cdn.com/profile.jpg',
    maxLength: 500,
  })
  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'URL to user profile image',
  })
  profileImageUrl: string;

  @ApiPropertyOptional({
    description: 'Preferred language',
    example: 'en',
    maxLength: 10,
  })
  @Column({
    type: 'varchar',
    length: 10,
    nullable: true,
    default: 'en',
    comment: 'User preferred language code',
  })
  preferredLanguage: string;

  @ApiProperty({
    description: 'Account status',
    enum: AccountStatus,
    example: AccountStatus.ACTIVE,
  })
  @Column({
    type: 'enum',
    enum: AccountStatus,
    default: AccountStatus.ACTIVE,
    nullable: false,
    comment: 'Current account status',
  })
  @Index('IDX_users_status')
  status: AccountStatus;

  @ApiProperty({
    description: 'Email verification status',
    example: false,
  })
  @Column({
    type: 'boolean',
    default: false,
    nullable: false,
    comment: 'Whether user email has been verified',
  })
  @Index('IDX_users_email_verified')
  isEmailVerified: boolean;

  @ApiPropertyOptional({
    description: 'Refresh token for authentication',
    writeOnly: true,
  })
  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    select: false,
    comment: 'JWT refresh token - never returned in API responses',
  })
  refreshToken: string;

  // Audit fields
  @ApiProperty({
    description: 'Date created',
    example: '2024-01-01T00:00:00Z',
  })
  @CreateDateColumn({
    type: 'timestamptz',
    comment: 'When the user account was created',
  })
  @Index('IDX_users_created_at')
  createdAt: Date;

  @ApiProperty({
    description: 'Date updated',
    example: '2024-01-01T00:00:00Z',
  })
  @UpdateDateColumn({
    type: 'timestamptz',
    comment: 'When the user account was last updated',
  })
  @Index('IDX_users_updated_at')
  updatedAt: Date;

  // Soft delete support
  @ApiPropertyOptional({
    description: 'Date deleted',
    example: '2024-01-01T00:00:00Z',
  })
  @DeleteDateColumn({
    type: 'timestamptz',
    nullable: true,
    comment: 'When the user account was soft deleted',
  })
  @Index('IDX_users_deleted_at')
  deletedAt: Date;

  // GDPR compliance fields
  @ApiPropertyOptional({
    description: 'Date deactivated',
    example: '2024-01-01T00:00:00Z',
  })
  @Column({
    type: 'timestamptz',
    nullable: true,
    comment: 'When the user account was deactivated',
  })
  deactivatedAt: Date;

  @ApiPropertyOptional({
    description: 'Date deletion requested',
    example: '2024-01-01T00:00:00Z',
  })
  @Column({
    type: 'timestamptz',
    nullable: true,
    comment: 'When user requested account deletion',
  })
  deletionRequestedAt: Date;

  // Relationships with proper foreign key constraints
  @OneToMany(() => UserProgress, (progress) => progress.user, {
    cascade: ['remove'],
    onDelete: 'CASCADE',
  })
  progress: UserProgress[];

  @OneToMany(() => Course, (course) => course.instructor, {
    cascade: ['remove'],
    onDelete: 'SET NULL',
  })
  instructorCourses: Course[];

  @OneToMany(() => Certificate, (certificate) => certificate.user, {
    cascade: ['remove'],
    onDelete: 'CASCADE',
  })
  certificates: Certificate[];

  @OneToMany(() => CourseReview, (courseReview) => courseReview.user, {
    cascade: ['remove'],
    onDelete: 'CASCADE',
  })
  reviews: CourseReview[];

  @OneToMany(() => AuthToken, (authToken) => authToken.user, {
    cascade: ['remove'],
    onDelete: 'CASCADE',
  })
  authTokens: AuthToken[];

  @OneToOne(() => WalletInfo, (walletInfo) => walletInfo.user, {
    cascade: ['insert', 'update', 'remove'],
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'walletInfoId' })
  walletInfo: WalletInfo;

  @OneToOne(() => UserProfile, (profile) => profile.user, {
    cascade: ['insert', 'update', 'remove'],
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userProfileId' })
  profile: UserProfile;

  @OneToOne(() => UserSettings, (settings) => settings.user, {
    cascade: ['insert', 'update', 'remove'],
    onDelete: 'CASCADE',
    eager: true,
  })
  @JoinColumn({ name: 'userSettingsId' })
  settings: UserSettings;

  // Business logic methods
  async setPassword(password: string): Promise<void> {
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(password, salt);
  }

  async validatePassword(password: string): Promise<boolean> {
    if (!password || !this.password) {
      return false;
    }

    return bcrypt.compare(password, this.password);
  }

  getFullName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }

  isActive(): boolean {
    return this.status === AccountStatus.ACTIVE && !this.deletedAt;
  }

  canInstructCourses(): boolean {
    return this.isInstructor && this.isActive();
  }

  // Computed properties for API responses
  get displayName(): string {
    return this.getFullName() || this.username;
  }

  get isVerified(): boolean {
    return this.isEmailVerified;
  }
}
