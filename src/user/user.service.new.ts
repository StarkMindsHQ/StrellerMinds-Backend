import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  decodeCursor,
  buildCursorForCreatedAt,
  validatePaginationParams,
} from '../common/pagination/pagination.utils';
import { User, UserStatus, UserRole } from './entities/user.entity';
import { UserActivity, ActivityType } from './entities/user-activity.entity';
import {
  CreateUserDto,
  UpdateUserDto,
  UpdateProfileDto,
  ChangePasswordDto,
  UserQueryDto,
  BulkUpdateDto,
  UserResponseDto,
} from './dto/user.dto';
import { UserRepository } from '../common/repositories/implementations/user.repository';
import { UserActivityRepository } from '../common/repositories/implementations/user-activity.repository';
import { UnitOfWork } from '../common/repositories/unit-of-work/unit-of-work';
import * as bcrypt from 'bcrypt';
import { classToPlain } from 'class-transformer';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly activityRepository: UserActivityRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async create(createUserDto: CreateUserDto, createdBy?: string): Promise<UserResponseDto> {
    return await this.unitOfWork.withTransaction(async () => {
      const existingUser = await this.userRepository.findOne({
        where: [{ email: createUserDto.email }, { username: createUserDto.username }],
      });

      if (existingUser) {
        if (existingUser.email === createUserDto.email) {
          throw new ConflictException('Email already exists');
        }
        throw new ConflictException('Username already exists');
      }

      const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

      const user = this.userRepository.create({
        ...createUserDto,
        password: hashedPassword,
        roles: createUserDto.roles || [UserRole.USER],
        createdBy,
      });

      const savedUser = await this.userRepository.save(user);

      await this.logActivity({
        userId: savedUser.id,
        type: ActivityType.PROFILE_UPDATE,
        description: 'User account created',
        performedBy: createdBy,
      });

      return this.toResponseDto(savedUser);
    });
  }

  async findAll(query: UserQueryDto): Promise<{
    data: UserResponseDto[];
    total?: number;
    page?: number;
    limit: number;
    totalPages?: number;
    cursor?: string;
    nextCursor?: string | null;
  }> {
    const { page, limit, search, status, role, sortBy, sortOrder, createdAfter, createdBefore, cursor } =
      query;

    validatePaginationParams(page, limit, cursor);

    if (cursor) {
      const result = await this.userRepository.findUsersWithCursorPagination(cursor, limit, {
        status,
        role,
      });

      return {
        data: result.data.map((user) => this.toResponseDto(user)),
        cursor,
        nextCursor: result.nextCursor,
        limit,
      };
    }

    const result = await this.userRepository.findUsersWithPaginationAndFilters(page, limit, {
      search,
      status,
      role,
      createdAfter,
      createdBefore,
      sortBy,
      sortOrder,
    });

    return {
      data: result.data.map((user) => this.toResponseDto(user)),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findOneById(id);

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return this.toResponseDto(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findByEmail(email);
  }

  async findByUsername(username: string): Promise<User | null> {
    return await this.userRepository.findByUsername(username);
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    updatedBy?: string,
  ): Promise<UserResponseDto> {
    return await this.unitOfWork.withTransaction(async () => {
      const user = await this.userRepository.findOneById(id);

      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      if (updateUserDto.email && updateUserDto.email !== user.email) {
        const existingEmail = await this.findByEmail(updateUserDto.email);
        if (existingEmail) {
          throw new ConflictException('Email already exists');
        }
      }

      if (updateUserDto.username && updateUserDto.username !== user.username) {
        const existingUsername = await this.findByUsername(updateUserDto.username);
        if (existingUsername) {
          throw new ConflictException('Username already exists');
        }
      }

      if (updateUserDto.password) {
        updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
        (updateUserDto as any).passwordChangedAt = new Date();
      }

      Object.assign(user, updateUserDto);
      (user as any).updatedBy = updatedBy;

      const updatedUser = await this.userRepository.save(user);

      await this.logActivity({
        userId: id,
        type: ActivityType.PROFILE_UPDATE,
        description: 'User profile updated',
        performedBy: updatedBy,
      });

      return this.toResponseDto(updatedUser);
    });
  }

  async updateProfile(id: string, updateProfileDto: UpdateProfileDto): Promise<UserResponseDto> {
    return await this.unitOfWork.withTransaction(async () => {
      const user = await this.userRepository.findOneById(id);

      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      Object.assign(user, updateProfileDto);
      const updatedUser = await this.userRepository.save(user);

      await this.logActivity({
        userId: id,
        type: ActivityType.PROFILE_UPDATE,
        description: 'User profile updated',
        performedBy: id,
      });

      return this.toResponseDto(updatedUser);
    });
  }

  async changePassword(id: string, changePasswordDto: ChangePasswordDto): Promise<void> {
    return await this.unitOfWork.withTransaction(async () => {
      const user = await this.userRepository.findOneById(id);

      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      const isPasswordValid = await bcrypt.compare(changePasswordDto.currentPassword, user.password);

      if (!isPasswordValid) {
        throw new UnauthorizedException('Current password is incorrect');
      }

      user.password = await bcrypt.hash(changePasswordDto.newPassword, 10);
      (user as any).passwordChangedAt = new Date();

      await this.userRepository.save(user);

      await this.logActivity({
        userId: id,
        type: ActivityType.PASSWORD_CHANGE,
        description: 'Password changed',
        performedBy: id,
      });
    });
  }

  async uploadAvatar(id: string, avatarPath: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findOneById(id);

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    user.avatar = avatarPath;
    const updatedUser = await this.userRepository.save(user);

    return this.toResponseDto(updatedUser);
  }

  async suspend(id: string, suspendedBy: string): Promise<UserResponseDto> {
    const updatedUser = await this.userRepository.updateUserStatus(id, UserStatus.SUSPENDED);
    
    if (!updatedUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    await this.logActivity({
      userId: id,
      type: ActivityType.ACCOUNT_SUSPENDED,
      description: 'Account suspended',
      performedBy: suspendedBy,
    });

    return this.toResponseDto(updatedUser);
  }

  async reactivate(id: string, reactivatedBy: string): Promise<UserResponseDto> {
    const updatedUser = await this.userRepository.updateUserStatus(id, UserStatus.ACTIVE);
    
    if (!updatedUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    await this.logActivity({
      userId: id,
      type: ActivityType.ACCOUNT_REACTIVATED,
      description: 'Account reactivated',
      performedBy: reactivatedBy,
    });

    return this.toResponseDto(updatedUser);
  }

  async remove(id: string, deletedBy?: string): Promise<void> {
    return await this.unitOfWork.withTransaction(async () => {
      const user = await this.userRepository.findOneById(id);

      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      await this.userRepository.softDeleteUser(id, deletedBy);

      await this.logActivity({
        userId: id,
        type: ActivityType.ACCOUNT_DELETED,
        description: 'Account soft deleted',
        performedBy: deletedBy,
      });
    });
  }

  async bulkUpdate(
    bulkUpdateDto: BulkUpdateDto,
    updatedBy?: string,
  ): Promise<{
    success: number;
    failed: number;
  }> {
    return await this.unitOfWork.withTransaction(async () => {
      let success = 0;
      let failed = 0;

      for (const userId of bulkUpdateDto.userIds) {
        try {
          const user = await this.userRepository.findOneById(userId);

          if (!user) {
            failed++;
            continue;
          }

          const updateData: any = { updatedBy };

          if (bulkUpdateDto.status) {
            updateData.status = bulkUpdateDto.status;
          }

          if (bulkUpdateDto.roles) {
            updateData.roles = bulkUpdateDto.roles;
          }

          if (bulkUpdateDto.addPermissions) {
            user.permissions = [...(user.permissions || []), ...bulkUpdateDto.addPermissions];
            updateData.permissions = user.permissions;
          }

          if (bulkUpdateDto.removePermissions) {
            user.permissions = (user.permissions || []).filter(
              (p) => !bulkUpdateDto.removePermissions.includes(p),
            );
            updateData.permissions = user.permissions;
          }

          await this.userRepository.update(userId, updateData);

          await this.logActivity({
            userId,
            type: ActivityType.PROFILE_UPDATE,
            description: 'Bulk update applied',
            performedBy: updatedBy,
          });

          success++;
        } catch (error) {
          failed++;
        }
      }

      return { success, failed };
    });
  }

  async exportUserData(id: string): Promise<any> {
    const user = await this.userRepository.findOneById(id);

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const activities = await this.activityRepository.findByUserId(id);

    await this.logActivity({
      userId: id,
      type: ActivityType.DATA_EXPORT,
      description: 'User data exported',
      performedBy: id,
    });

    return {
      user: classToPlain(user),
      activities,
      exportedAt: new Date(),
    };
  }

  async getUserActivities(userId: string, limit: number = 50): Promise<UserActivity[]> {
    return await this.activityRepository.findByUserId(userId, limit);
  }

  async getUserStats(userId: string): Promise<{
    totalActivities: number;
    activitiesByType: Record<ActivityType, number>;
    dailyActivityCounts: Array<{ date: string; count: number }>;
  }> {
    return await this.activityRepository.getActivityStats(userId, 30);
  }

  private async logActivity(data: {
    userId: string;
    type: ActivityType;
    description: string;
    performedBy?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await this.activityRepository.logActivity(data);
  }

  private toResponseDto(user: User): UserResponseDto {
    const plain = classToPlain(user) as any;
    return {
      id: plain.id,
      email: plain.email,
      username: plain.username,
      firstName: plain.firstName,
      lastName: plain.lastName,
      fullName: user.fullName,
      avatar: plain.avatar,
      phone: plain.phone,
      bio: plain.bio,
      dateOfBirth: plain.dateOfBirth,
      status: plain.status,
      roles: plain.roles,
      permissions: plain.permissions,
      emailVerified: plain.emailVerified,
      lastLogin: plain.lastLogin,
      loginCount: plain.loginCount,
      twoFactorEnabled: plain.twoFactorEnabled,
      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
    };
  }
}
