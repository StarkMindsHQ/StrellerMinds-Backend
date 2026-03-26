import { User, UserStatus, UserRole } from '../entities/user.entity';
import { CreateUserDto, UpdateUserDto, UserResponseDto, UserQueryDto } from '../dto/user.dto';

/**
 * Interface for User Service operations
 */
export interface IUserService {
  /**
   * Create a new user
   */
  createUser(createUserDto: CreateUserDto, createdBy?: string): Promise<UserResponseDto>;

  /**
   * Create user entity (for internal use)
   */
  create(data: any): Promise<User>;

  /**
   * Find user by ID
   */
  findById(id: string): Promise<User | null>;

  /**
   * Find user by email
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Find user by username
   */
  findByUsername(username: string): Promise<User | null>;

  /**
   * Get all users with filtering and pagination
   */
  findAllWithPagination(query: UserQueryDto): Promise<{
    data: UserResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;

  /**
   * Find all users without pagination (for internal use)
   */
  findAll(filters?: any): Promise<User[]>;

  /**
   * Update user information
   */
  updateUser(
    id: string,
    updateUserDto: UpdateUserDto,
    updatedBy?: string,
  ): Promise<UserResponseDto>;

  /**
   * Update user entity (for internal use)
   */
  update(id: string, data: any): Promise<User>;

  /**
   * Update user profile
   */
  updateProfile(id: string, updateProfileDto: any): Promise<UserResponseDto>;

  /**
   * Change user password
   */
  changePassword(id: string, changePasswordDto: any): Promise<void>;

  /**
   * Upload user avatar
   */
  uploadAvatar(id: string, avatarPath: string): Promise<UserResponseDto>;

  /**
   * Suspend user account
   */
  suspend(id: string, suspendedBy?: string): Promise<UserResponseDto>;

  /**
   * Reactivate suspended user
   */
  reactivate(id: string, reactivatedBy?: string): Promise<UserResponseDto>;

  /**
   * Soft delete user
   */
  remove(id: string, deletedBy?: string): Promise<void>;

  /**
   * Bulk update multiple users
   */
  bulkUpdate(bulkUpdateDto: any, updatedBy?: string): Promise<{ success: number; failed: number }>;

  /**
   * Export user data (GDPR compliance)
   */
  exportUserData(id: string): Promise<any>;

  /**
   * Get user activity history
   */
  getUserActivities(id: string, limit?: number): Promise<any[]>;

  /**
   * Validate user data
   */
  validateUserData(data: any, operation: 'create' | 'update'): Promise<void>;

  /**
   * Check if user exists by email
   */
  existsByEmail(email: string): Promise<boolean>;

  /**
   * Check if user exists by username
   */
  existsByUsername(username: string): Promise<boolean>;

  /**
   * Get user statistics
   */
  getUserStatistics(): Promise<{
    total: number;
    active: number;
    suspended: number;
    pending: number;
  }>;
}
