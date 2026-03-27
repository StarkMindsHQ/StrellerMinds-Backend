import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { AggregateRoot } from '../../common/domain/aggregate-root.base';
import { Email } from '../../common/domain/value-objects/email.value-object';
import { UserName } from '../../common/domain/value-objects/username.value-object';
import { Password } from '../../common/domain/value-objects/password.value-object';
import { 
  UserRegisteredEvent, 
  UserPasswordChangedEvent, 
  UserAccountLockedEvent,
  UserAccountUnlockedEvent 
} from '../../common/domain/events/user.domain-events';

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
}

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MANAGER = 'manager',
  USER = 'user',
  GUEST = 'guest',
}

@Entity('users')
@Index(['email'], { unique: true })
@Index(['username'], { unique: true })
export class User extends AggregateRoot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  private _email: string;

  @Column({ unique: true })
  private _username: string;

  @Column()
  @Exclude()
  private _password: string;

  @Column({ name: 'first_name', nullable: true })
  firstName: string;

  @Column({ name: 'last_name', nullable: true })
  lastName: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth: Date;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Column('simple-array', { default: UserRole.USER })
  roles: UserRole[];

  @Column('simple-json', { nullable: true })
  permissions: string[];

  @Column('simple-json', { nullable: true })
  preferences: {
    theme?: string;
    language?: string;
    notifications?: boolean;
    timezone?: string;
  };

  @Column({ name: 'email_verified', default: false })
  emailVerified: boolean;

  @Column({ name: 'last_login', type: 'timestamp', nullable: true })
  lastLogin: Date;

  @Column({ name: 'login_count', default: 0 })
  loginCount: number;

  @Column({ name: 'failed_login_attempts', default: 0 })
  private _failedLoginAttempts: number;

  @Column({ name: 'account_locked_until', type: 'timestamp', nullable: true })
  private _accountLockedUntil: Date;

  @Column({ name: 'password_changed_at', type: 'timestamp', nullable: true })
  passwordChangedAt: Date;

  @Column({ name: 'two_factor_enabled', default: false })
  twoFactorEnabled: boolean;

  @Column({ name: 'two_factor_secret', nullable: true })
  @Exclude()
  twoFactorSecret: string;

  @Column('simple-json', { nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;

  @Column({ name: 'created_by', nullable: true })
  createdBy: string;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy: string;

  @Column({ name: 'deleted_by', nullable: true })
  deletedBy: string;

  // Static factory method for creating new users
  static async create(
    email: string,
    username: string,
    password: string,
    roles: UserRole[] = [UserRole.USER]
  ): Promise<User> {
    const user = new User();
    
    user._email = Email.create(email).getValue();
    user._username = UserName.create(username).getValue();
    user._password = (await Password.create(password)).getHashedValue();
    user.roles = roles;
    user.status = UserStatus.ACTIVE;
    user._failedLoginAttempts = 0;
    user._accountLockedUntil = null;
    user.emailVerified = false;
    user.loginCount = 0;

    // Add domain event
    user.addDomainEvent(new UserRegisteredEvent(
      user.id,
      user._email,
      user._username,
      user.roles
    ));

    return user;
  }

  // Getters for private fields
  get email(): string {
    return this._email;
  }

  get username(): string {
    return this._username;
  }

  get failedLoginAttempts(): number {
    return this._failedLoginAttempts;
  }

  get accountLockedUntil(): Date {
    return this._accountLockedUntil;
  }

  // Business logic methods
  get fullName(): string {
    return `${this.firstName || ''} ${this.lastName || ''}`.trim() || this._username;
  }

  hasRole(role: UserRole): boolean {
    return this.roles.includes(role);
  }

  hasPermission(permission: string): boolean {
    return this.permissions?.includes(permission) || false;
  }

  isActive(): boolean {
    return this.status === UserStatus.ACTIVE && !this.isAccountLocked();
  }

  isAccountLocked(): boolean {
    return this._accountLockedUntil && new Date() < this._accountLockedUntil;
  }

  async changePassword(newPassword: string): Promise<void> {
    this._password = (await Password.create(newPassword)).getHashedValue();
    this.passwordChangedAt = new Date();
    this._failedLoginAttempts = 0;
    this._accountLockedUntil = null;

    this.addDomainEvent(new UserPasswordChangedEvent(this.id, this.passwordChangedAt));
  }

  recordFailedLogin(): void {
    this._failedLoginAttempts += 1;

    // Lock account after 5 failed attempts for 30 minutes
    if (this._failedLoginAttempts >= 5) {
      this._accountLockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      this.addDomainEvent(new UserAccountLockedEvent(
        this.id,
        this._accountLockedUntil,
        'Too many failed login attempts'
      ));
    }
  }

  recordSuccessfulLogin(): void {
    this.lastLogin = new Date();
    this.loginCount += 1;
    this._failedLoginAttempts = 0;
    this._accountLockedUntil = null;
  }

  unlockAccount(): void {
    this._failedLoginAttempts = 0;
    this._accountLockedUntil = null;
    this.addDomainEvent(new UserAccountUnlockedEvent(this.id, new Date()));
  }

  updateEmail(newEmail: string): void {
    this._email = Email.create(newEmail).getValue();
    this.emailVerified = false; // Require re-verification
  }

  updateUsername(newUsername: string): void {
    this._username = UserName.create(newUsername).getValue();
  }

  activate(): void {
    this.status = UserStatus.ACTIVE;
  }

  deactivate(): void {
    this.status = UserStatus.INACTIVE;
  }

  suspend(): void {
    this.status = UserStatus.SUSPENDED;
  }

  canLogin(): boolean {
    return this.isActive() && !this.isAccountLocked();
  }

  // Method to verify password
  async verifyPassword(password: string): Promise<boolean> {
    const passwordObj = Password.fromHashed(this._password);
    return passwordObj.verify(password);
  }
}
