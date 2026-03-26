import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { Repository } from 'typeorm';
import { User, UserStatus, UserRole } from './entities/user.entity';
import { UserActivity, ActivityType } from './entities/user-activity.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  CreateUserDto,
  UpdateUserDto,
  UpdateProfileDto,
  ChangePasswordDto,
  UserQueryDto,
  BulkUpdateDto,
} from './dto/user.dto';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('UserService', () => {
  let service: UserService;
  let userRepository: Repository<User>;
  let activityRepository: Repository<UserActivity>;
  let bcryptMock: jest.Mocked<typeof bcrypt>;

  const mockUser: Partial<User> = {
    id: 'test-user-id',
    email: 'test@example.com',
    username: 'testuser',
    firstName: 'John',
    lastName: 'Doe',
    password: 'hashedPassword',
    status: UserStatus.ACTIVE,
    roles: [UserRole.USER],
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    fullName: 'John Doe',
  };

  const mockActivity: Partial<UserActivity> = {
    id: 'activity-id',
    userId: 'test-user-id',
    type: ActivityType.PROFILE_UPDATE,
    description: 'Test activity',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    bcryptMock = bcrypt as jest.Mocked<typeof bcrypt>;
    bcryptMock.hash = jest.fn().mockResolvedValue('hashedPassword');
    bcryptMock.compare = jest.fn().mockResolvedValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
            createQueryBuilder: jest.fn(),
            getCount: jest.fn(),
            getMany: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserActivity),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    activityRepository = module.get<Repository<UserActivity>>(
      getRepositoryToken(UserActivity),
    );
  });

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      email: 'newuser@example.com',
      username: 'newuser',
      password: 'Password123!',
      firstName: 'Jane',
      lastName: 'Smith',
    };

    it('should create a new user successfully', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(userRepository, 'create').mockReturnValue(mockUser as User);
      jest.spyOn(userRepository, 'save').mockResolvedValue(mockUser as User);
      jest.spyOn(activityRepository, 'create').mockReturnValue(mockActivity as UserActivity);
      jest.spyOn(activityRepository, 'save').mockResolvedValue(mockActivity as UserActivity);

      const result = await service.create(createUserDto);

      expect(result).toHaveProperty('id');
      expect(result.email).toBe(createUserDto.email);
      expect(bcryptMock.hash).toHaveBeenCalledWith(createUserDto.password, 10);
      expect(userRepository.save).toHaveBeenCalled();
      expect(activityRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as User);

      await expect(service.create(createUserDto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if username already exists', async () => {
      const existingUser = { ...mockUser, email: 'different@example.com' };
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(existingUser as User);

      await expect(service.create(createUserDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    const query: UserQueryDto = {
      page: 1,
      limit: 10,
      search: 'test',
      status: UserStatus.ACTIVE,
      role: UserRole.USER,
      sortBy: 'createdAt',
      sortOrder: 'DESC',
    };

    it('should return paginated users', async () => {
      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockUser as User]),
      };

      jest.spyOn(userRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      const result = await service.findAll(query);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should handle cursor-based pagination', async () => {
      const cursorQuery = { ...query, cursor: 'eyJjcmVhdGVkQXQiOiIyMDIzLTAxLTAxVDAwOjAwOjAwLjAwMFoiLCJpZCI6InRlc3QtaWQifQ==' };
      
      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockUser as User]),
      };

      jest.spyOn(userRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      const result = await service.findAll(cursorQuery);

      expect(result.data).toHaveLength(1);
      expect(result.cursor).toBe(cursorQuery.cursor);
      expect(result.nextCursor).toBeDefined();
    });

    it('should throw BadRequestException for invalid cursor', async () => {
      const invalidQuery = { ...query, cursor: 'invalid-cursor' };

      await expect(service.findAll(invalidQuery)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should return user by ID', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as User);

      const result = await service.findOne('test-user-id');

      expect(result.id).toBe('test-user-id');
      expect(result.email).toBe('test@example.com');
    });

    it('should throw NotFoundException if user not found', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateUserDto: UpdateUserDto = {
      firstName: 'Updated',
      email: 'updated@example.com',
    };

    it('should update user successfully', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as User);
      jest.spyOn(userRepository, 'save').mockResolvedValue({
        ...mockUser,
        ...updateUserDto,
      } as User);
      jest.spyOn(activityRepository, 'create').mockReturnValue(mockActivity as UserActivity);
      jest.spyOn(activityRepository, 'save').mockResolvedValue(mockActivity as UserActivity);

      const result = await service.update('test-user-id', updateUserDto);

      expect(result.firstName).toBe('Updated');
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.update('nonexistent-id', updateUserDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if email already exists', async () => {
      const existingUser = { ...mockUser, id: 'different-id' };
      jest.spyOn(userRepository, 'findOne').mockResolvedValueOnce(mockUser as User);
      jest.spyOn(service, 'findByEmail').mockResolvedValue(existingUser as User);

      await expect(service.update('test-user-id', updateUserDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should hash password if provided', async () => {
      const updateWithPassword = { ...updateUserDto, password: 'NewPassword123!' };
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as User);
      jest.spyOn(userRepository, 'save').mockResolvedValue({
        ...mockUser,
        ...updateWithPassword,
      } as User);

      await service.update('test-user-id', updateWithPassword);

      expect(bcryptMock.hash).toHaveBeenCalledWith('NewPassword123!', 10);
    });
  });

  describe('changePassword', () => {
    const changePasswordDto: ChangePasswordDto = {
      currentPassword: 'OldPassword123!',
      newPassword: 'NewPassword123!',
    };

    it('should change password successfully', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as User);
      jest.spyOn(userRepository, 'save').mockResolvedValue(mockUser as User);
      jest.spyOn(activityRepository, 'create').mockReturnValue(mockActivity as UserActivity);
      jest.spyOn(activityRepository, 'save').mockResolvedValue(mockActivity as UserActivity);

      await service.changePassword('test-user-id', changePasswordDto);

      expect(bcryptMock.compare).toHaveBeenCalledWith(
        changePasswordDto.currentPassword,
        mockUser.password,
      );
      expect(bcryptMock.hash).toHaveBeenCalledWith(changePasswordDto.newPassword, 10);
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.changePassword('nonexistent-id', changePasswordDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException for incorrect current password', async () => {
      bcryptMock.compare.mockResolvedValue(false);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as User);

      await expect(
        service.changePassword('test-user-id', changePasswordDto),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('suspend', () => {
    it('should suspend user successfully', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as User);
      jest.spyOn(userRepository, 'save').mockResolvedValue({
        ...mockUser,
        status: UserStatus.SUSPENDED,
      } as User);
      jest.spyOn(activityRepository, 'create').mockReturnValue(mockActivity as UserActivity);
      jest.spyOn(activityRepository, 'save').mockResolvedValue(mockActivity as UserActivity);

      const result = await service.suspend('test-user-id', 'admin-id');

      expect(result.status).toBe(UserStatus.SUSPENDED);
      expect(userRepository.save).toHaveBeenCalled();
    });
  });

  describe('reactivate', () => {
    it('should reactivate user successfully', async () => {
      const suspendedUser = { ...mockUser, status: UserStatus.SUSPENDED };
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(suspendedUser as User);
      jest.spyOn(userRepository, 'save').mockResolvedValue({
        ...suspendedUser,
        status: UserStatus.ACTIVE,
      } as User);
      jest.spyOn(activityRepository, 'create').mockReturnValue(mockActivity as UserActivity);
      jest.spyOn(activityRepository, 'save').mockResolvedValue(mockActivity as UserActivity);

      const result = await service.reactivate('test-user-id', 'admin-id');

      expect(result.status).toBe(UserStatus.ACTIVE);
      expect(userRepository.save).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should soft delete user successfully', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as User);
      jest.spyOn(userRepository, 'save').mockResolvedValue(mockUser as User);
      jest.spyOn(userRepository, 'softDelete').mockResolvedValue(undefined);
      jest.spyOn(activityRepository, 'create').mockReturnValue(mockActivity as UserActivity);
      jest.spyOn(activityRepository, 'save').mockResolvedValue(mockActivity as UserActivity);

      await service.remove('test-user-id', 'admin-id');

      expect(userRepository.softDelete).toHaveBeenCalledWith('test-user-id');
      expect(activityRepository.save).toHaveBeenCalled();
    });
  });

  describe('bulkUpdate', () => {
    const bulkUpdateDto: BulkUpdateDto = {
      userIds: ['user1', 'user2'],
      status: UserStatus.SUSPENDED,
    };

    it('should bulk update users successfully', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as User);
      jest.spyOn(userRepository, 'save').mockResolvedValue(mockUser as User);
      jest.spyOn(activityRepository, 'create').mockReturnValue(mockActivity as UserActivity);
      jest.spyOn(activityRepository, 'save').mockResolvedValue(mockActivity as UserActivity);

      const result = await service.bulkUpdate(bulkUpdateDto, 'admin-id');

      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
    });

    it('should handle mixed success/failure in bulk update', async () => {
      jest.spyOn(userRepository, 'findOne')
        .mockResolvedValueOnce(mockUser as User)
        .mockResolvedValueOnce(null);
      jest.spyOn(userRepository, 'save').mockResolvedValue(mockUser as User);
      jest.spyOn(activityRepository, 'create').mockReturnValue(mockActivity as UserActivity);
      jest.spyOn(activityRepository, 'save').mockResolvedValue(mockActivity as UserActivity);

      const result = await service.bulkUpdate(bulkUpdateDto, 'admin-id');

      expect(result.success).toBe(1);
      expect(result.failed).toBe(1);
    });
  });

  describe('exportUserData', () => {
    it('should export user data successfully', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as User);
      jest.spyOn(activityRepository, 'find').mockResolvedValue([mockActivity as UserActivity]);
      jest.spyOn(activityRepository, 'create').mockReturnValue(mockActivity as UserActivity);
      jest.spyOn(activityRepository, 'save').mockResolvedValue(mockActivity as UserActivity);

      const result = await service.exportUserData('test-user-id');

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('activities');
      expect(result).toHaveProperty('exportedAt');
      expect(result.activities).toHaveLength(1);
    });
  });

  describe('getUserActivities', () => {
    it('should return user activities', async () => {
      jest.spyOn(activityRepository, 'find').mockResolvedValue([mockActivity as UserActivity]);

      const result = await service.getUserActivities('test-user-id');

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe('test-user-id');
    });
  });
});
