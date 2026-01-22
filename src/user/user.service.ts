import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In, Between } from 'typeorm';
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
import * as bcrypt from 'bcrypt';
import { classToPlain } from 'class-transformer';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserActivity)
    private activityRepository: Repository<UserActivity>,
  ) {}

  async create(
    createUserDto: CreateUserDto,
    createdBy?: string,
  ): Promise<UserResponseDto> {
    const existingUser = await this.userRepository.findOne({
      where: [
        { email: createUserDto.email },
        { username: createUserDto.username },
      ],
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
  }

  async findAll(query: UserQueryDto): Promise<{
    data: UserResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page, limit, search, status, role, sortBy, sortOrder, createdAfter, createdBefore } = query;

    const qb = this.userRepository.createQueryBuilder('user');

    if (search) {
      qb.andWhere(
        '(user.email LIKE :search OR user.username LIKE :search OR user.firstName LIKE :search OR user.lastName LIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (status) {
      qb.andWhere('user.status = :status', { status });
    }

    if (role) {
      qb.andWhere('user.roles LIKE :role', { role: `%${role}%` });
    }

    if (createdAfter) {
      qb.andWhere('user.createdAt >= :createdAfter', { createdAfter });
    }

    if (createdBefore) {
      qb.andWhere('user.createdAt <= :createdBefore', { createdBefore });
    }

    const total = await qb.getCount();

    qb.orderBy(`user.${sortBy}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit);

    const users = await qb.getMany();

    return {
      data: users.map(user => this.toResponseDto(user)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return this.toResponseDto(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { username } });
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    updatedBy?: string,
  ): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { id } });

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
      user.passwordChangedAt = new Date();
    }

    Object.assign(user, updateUserDto);
    user.updatedBy = updatedBy;

    const updatedUser = await this.userRepository.save(user);

    await this.logActivity({
      userId: id,
      type: ActivityType.PROFILE_UPDATE,
      description: 'User profile updated',
      performedBy: updatedBy,
    });

    return this.toResponseDto(updatedUser);
  }

  async updateProfile(
    id: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { id } });

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
  }

  async changePassword(
    id: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const isPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    user.password = await bcrypt.hash(changePasswordDto.newPassword, 10);
    user.passwordChangedAt = new Date();

    await this.userRepository.save(user);

    await this.logActivity({
      userId: id,
      type: ActivityType.PASSWORD_CHANGE,
      description: 'Password changed',
      performedBy: id,
    });
  }

  async uploadAvatar(id: string, avatarPath: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    user.avatar = avatarPath;
    const updatedUser = await this.userRepository.save(user);

    return this.toResponseDto(updatedUser);
  }

  async suspend(id: string, suspendedBy: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    user.status = UserStatus.SUSPENDED;
    user.updatedBy = suspendedBy;

    const updatedUser = await this.userRepository.save(user);

    await this.logActivity({
      userId: id,
      type: ActivityType.ACCOUNT_SUSPENDED,
      description: 'Account suspended',
      performedBy: suspendedBy,
    });

    return this.toResponseDto(updatedUser);
  }

  async reactivate(id: string, reactivatedBy: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    user.status = UserStatus.ACTIVE;
    user.updatedBy = reactivatedBy;

    const updatedUser = await this.userRepository.save(user);

    await this.logActivity({
      userId: id,
      type: ActivityType.ACCOUNT_REACTIVATED,
      description: 'Account reactivated',
      performedBy: reactivatedBy,
    });

    return this.toResponseDto(updatedUser);
  }

  async remove(id: string, deletedBy?: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    user.deletedBy = deletedBy;
    await this.userRepository.save(user);

    await this.logActivity({
      userId: id,
      type: ActivityType.ACCOUNT_DELETED,
      description: 'Account soft deleted',
      performedBy: deletedBy,
    });

    await this.userRepository.softDelete(id);
  }

  async bulkUpdate(bulkUpdateDto: BulkUpdateDto, updatedBy?: string): Promise<{
    success: number;
    failed: number;
  }> {
    let success = 0;
    let failed = 0;

    for (const userId of bulkUpdateDto.userIds) {
      try {
        const user = await this.userRepository.findOne({ where: { id: userId } });

        if (!user) {
          failed++;
          continue;
        }

        if (bulkUpdateDto.status) {
          user.status = bulkUpdateDto.status;
        }

        if (bulkUpdateDto.roles) {
          user.roles = bulkUpdateDto.roles;
        }

        if (bulkUpdateDto.addPermissions) {
          user.permissions = [
            ...(user.permissions || []),
            ...bulkUpdateDto.addPermissions,
          ];
        }

        if (bulkUpdateDto.removePermissions) {
          user.permissions = (user.permissions || []).filter(
            p => !bulkUpdateDto.removePermissions.includes(p),
          );
        }

        user.updatedBy = updatedBy;
        await this.userRepository.save(user);

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
  }

  async exportUserData(id: string): Promise<any> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const activities = await this.activityRepository.find({
      where: { userId: id },
      order: { createdAt: 'DESC' },
    });

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

  async getUserActivities(
    userId: string,
    limit: number = 50,
  ): Promise<UserActivity[]> {
    return this.activityRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
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
    const activity = this.activityRepository.create(data);
    await this.activityRepository.save(activity);
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