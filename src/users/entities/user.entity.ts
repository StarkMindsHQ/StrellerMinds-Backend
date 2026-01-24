/**
 * User entity representing a platform user.
 */
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
} from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserProgress } from './user-progress.entity';
import { WalletInfo } from './wallet-info.entity';
import { UserRole } from '../enums/userRole.enum';
import { AccountStatus } from '../enums/accountStatus.enum';
import { AuthToken } from '../../auth/entities/auth-token.entity';
import { Course } from '../../courses/entities/course.entity';
import { CourseReview } from '../../courses/entities/course-review.entity';
import { Certificate } from '../../certificate/entity/certificate.entity';
import { UserProfile } from 'src/user-profiles/entities/user-profile.entity';
import { UserSettings } from './user-settings.entity';
import { CoursesAdvance } from 'src/courses-advances/entities/courses-advance.entity';

@Entity('users')
export class User {
  @ApiProperty({ description: 'Unique user ID', example: 'uuid-v4' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ description: 'First name', example: 'John' })
  @Column()
  firstName!: string;

  @ApiProperty({ description: 'Last name', example: 'Doe' })
  @Column()
  lastName!: string;

  @ApiProperty({ description: 'Email address', example: 'user@example.com' })
  @Column({ unique: true })
  @Index()
  email!: string;

  @ApiProperty({ description: 'Password hash', example: 'hashed-password', writeOnly: true })
  @Column({ select: false })
  password!: string;

  @ApiProperty({ description: 'Is user an instructor', example: false })
  @Column({ default: false })
  isInstructor!: boolean;

  @ApiPropertyOptional({ description: 'User biography', example: 'A short bio' })
  @Column({ nullable: true, type: 'text' })
  bio!: string;

  @ApiProperty({ enum: UserRole, description: 'User role', example: UserRole.STUDENT })
  @Column({ type: 'enum', enum: UserRole, default: UserRole.STUDENT })
  @Index()
  role!: UserRole;

  @ApiPropertyOptional({ description: 'Profile image URL', example: 'https://cdn.com/profile.jpg' })
  @OneToMany(() => CoursesAdvance, (course) => course.instructor)
  courses!: CoursesAdvance;

  @Column({ nullable: true })
  profileImageUrl?: string;

  @ApiPropertyOptional({ description: 'Preferred language', example: 'en' })
  @Column({ nullable: true })
  preferredLanguage!: string;

  @ApiProperty({ description: 'Date created', example: '2024-01-01T00:00:00Z' })
  @CreateDateColumn()
  @Index()
  createdAt!: Date;

  @ApiProperty({ description: 'Date updated', example: '2024-01-01T00:00:00Z' })
  @UpdateDateColumn()
  updatedAt!: Date;

  @ApiProperty({ enum: AccountStatus, description: 'Account status', example: AccountStatus.ACTIVE })
  @Column({ type: 'enum', enum: AccountStatus, default: AccountStatus.ACTIVE })
  @Index()
  status!: AccountStatus;

  @ApiPropertyOptional({ description: 'Date deactivated', example: '2024-01-01T00:00:00Z' })
  @Column({ nullable: true })
  deactivatedAt!: Date;

  @ApiPropertyOptional({ description: 'Date deletion requested', example: '2024-01-01T00:00:00Z' })
  @Column({ nullable: true })
  deletionRequestedAt!: Date;

  @ApiPropertyOptional({ description: 'Date deleted', example: '2024-01-01T00:00:00Z' })
  @DeleteDateColumn({ nullable: true })
  deletedAt!: Date;

  @OneToMany(() => UserProgress, (progress) => progress.user)
  progress!: Promise<UserProgress[]>;

  @OneToMany(() => Course, (course) => course.instructor)
  instructorCourses!: Course[];

  @OneToMany(() => Certificate, (certificate) => certificate.user)
  certificates!: Certificate[];

  @OneToMany(() => CourseReview, (courseReview) => courseReview.user)
  reviews!: CourseReview[];

  @OneToMany(() => AuthToken, (authToken) => authToken.user)
  authTokens!: Promise<AuthToken[]>;

  @OneToOne(() => WalletInfo, (walletInfo) => walletInfo.user)
  walletInfo!: WalletInfo;

  @Column({ nullable: true })
  refreshToken?: string;

  @Column({ default: false })
  isEmailVerified!: boolean;

  @OneToOne(() => UserProfile, (profile) => profile.user, { cascade: true })
  profile!: UserProfile;

  @OneToOne(() => UserSettings, (settings) => settings.user, {
    cascade: true,
    eager: true,
  })
  settings!: UserSettings;

  @ApiProperty({ description: 'Username', example: 'johndoe', uniqueItems: true })
  @Column({ unique: true, nullable: false })
  username!: string;

  gradesGiven: any;
  gradesReceived: any;
  reputation!: number;

  async setPassword(password: string): Promise<void> {
    const salt = await bcrypt.genSalt();
    this.password = await bcrypt.hash(password, salt);
  }

  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }
}