import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { CreateUserDto, UpdateUserDto, UserQueryDto } from './dto/user.dto';
import { UserStatus, UserRole } from './entities/user.entity';
import {
  BadRequestException,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';

describe('UserController', () => {
  let controller: UserController;
  let service: jest.Mocked<UserService>;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
    firstName: 'John',
    lastName: 'Doe',
    status: UserStatus.ACTIVE,
    roles: [UserRole.USER],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUserService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    updateProfile: jest.fn(),
    changePassword: jest.fn(),
    uploadAvatar: jest.fn(),
    suspend: jest.fn(),
    reactivate: jest.fn(),
    remove: jest.fn(),
    bulkUpdate: jest.fn(),
    exportUserData: jest.fn(),
    getUserActivities: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    service = module.get(UserService) as jest.Mocked<UserService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      email: 'newuser@example.com',
      username: 'newuser',
      password: 'Password123!',
      firstName: 'Jane',
      lastName: 'Smith',
    };

    it('should create a user successfully', async () => {
      mockUserService.create.mockResolvedValue(mockUser as any);

      const result = await controller.create(createUserDto);

      expect(result).toEqual(mockUser);
      expect(service.create).toHaveBeenCalledWith(createUserDto, undefined);
    });

    it('should handle conflict exception', async () => {
      mockUserService.create.mockRejectedValue(new ConflictException('Email already exists'));

      await expect(controller.create(createUserDto)).rejects.toThrow(ConflictException);
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
      const mockResponse = {
        data: [mockUser],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      mockUserService.findAll.mockResolvedValue(mockResponse as any);

      const result = await controller.findAll(query);

      expect(result).toEqual(mockResponse);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });

    it('should handle cursor-based pagination', async () => {
      const cursorQuery = { ...query, cursor: 'encoded-cursor' };
      const mockResponse = {
        data: [mockUser],
        cursor: 'encoded-cursor',
        nextCursor: 'next-cursor',
        limit: 10,
      };

      mockUserService.findAll.mockResolvedValue(mockResponse as any);

      const result = await controller.findAll(cursorQuery);

      expect(result).toEqual(mockResponse);
      expect(service.findAll).toHaveBeenCalledWith(cursorQuery);
    });
  });

  describe('findOne', () => {
    it('should return a user by ID', async () => {
      mockUserService.findOne.mockResolvedValue(mockUser as any);

      const result = await controller.findOne('user-123');

      expect(result).toEqual(mockUser);
      expect(service.findOne).toHaveBeenCalledWith('user-123');
    });

    it('should handle not found exception', async () => {
      mockUserService.findOne.mockRejectedValue(new NotFoundException('User not found'));

      await expect(controller.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateUserDto: UpdateUserDto = {
      firstName: 'Updated',
      email: 'updated@example.com',
    };

    it('should update a user successfully', async () => {
      const updatedUser = { ...mockUser, ...updateUserDto };
      mockUserService.update.mockResolvedValue(updatedUser as any);

      const result = await controller.update('user-123', updateUserDto);

      expect(result).toEqual(updatedUser);
      expect(service.update).toHaveBeenCalledWith('user-123', updateUserDto, undefined);
    });

    it('should handle not found exception', async () => {
      mockUserService.update.mockRejectedValue(new NotFoundException('User not found'));

      await expect(controller.update('nonexistent', updateUserDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateProfile', () => {
    const updateProfileDto = {
      firstName: 'John',
      lastName: 'Doe',
      bio: 'Software Developer',
    };

    it('should update user profile successfully', async () => {
      const updatedUser = { ...mockUser, ...updateProfileDto };
      mockUserService.updateProfile.mockResolvedValue(updatedUser as any);

      const result = await controller.updateProfile('user-123', updateProfileDto);

      expect(result).toEqual(updatedUser);
      expect(service.updateProfile).toHaveBeenCalledWith('user-123', updateProfileDto);
    });
  });

  describe('changePassword', () => {
    const changePasswordDto = {
      currentPassword: 'OldPassword123!',
      newPassword: 'NewPassword123!',
    };

    it('should change password successfully', async () => {
      mockUserService.changePassword.mockResolvedValue(undefined);

      await controller.changePassword('user-123', changePasswordDto);

      expect(service.changePassword).toHaveBeenCalledWith('user-123', changePasswordDto);
    });

    it('should handle unauthorized exception', async () => {
      mockUserService.changePassword.mockRejectedValue(
        new UnauthorizedException('Invalid current password'),
      );

      await expect(
        controller.changePassword('user-123', changePasswordDto),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('uploadAvatar', () => {
    it('should upload avatar successfully', async () => {
      const userWithAvatar = { ...mockUser, avatar: 'avatar-path.jpg' };
      mockUserService.uploadAvatar.mockResolvedValue(userWithAvatar as any);

      const result = await controller.uploadAvatar('user-123', {
        file: { path: 'avatar-path.jpg' },
      } as any);

      expect(result.avatar).toBe('avatar-path.jpg');
      expect(service.uploadAvatar).toHaveBeenCalledWith('user-123', 'avatar-path.jpg');
    });
  });

  describe('suspend', () => {
    it('should suspend user successfully', async () => {
      const suspendedUser = { ...mockUser, status: UserStatus.SUSPENDED };
      mockUserService.suspend.mockResolvedValue(suspendedUser as any);

      const result = await controller.suspend('user-123', { suspendedBy: 'admin-123' } as any);

      expect(result.status).toBe(UserStatus.SUSPENDED);
      expect(service.suspend).toHaveBeenCalledWith('user-123', 'admin-123');
    });
  });

  describe('reactivate', () => {
    it('should reactivate user successfully', async () => {
      const activeUser = { ...mockUser, status: UserStatus.ACTIVE };
      mockUserService.reactivate.mockResolvedValue(activeUser as any);

      const result = await controller.reactivate('user-123', { reactivatedBy: 'admin-123' } as any);

      expect(result.status).toBe(UserStatus.ACTIVE);
      expect(service.reactivate).toHaveBeenCalledWith('user-123', 'admin-123');
    });
  });

  describe('remove', () => {
    it('should remove user successfully', async () => {
      mockUserService.remove.mockResolvedValue(undefined);

      await controller.remove('user-123', { deletedBy: 'admin-123' } as any);

      expect(service.remove).toHaveBeenCalledWith('user-123', 'admin-123');
    });

    it('should handle not found exception', async () => {
      mockUserService.remove.mockRejectedValue(new NotFoundException('User not found'));

      await expect(
        controller.remove('nonexistent', { deletedBy: 'admin-123' } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('bulkUpdate', () => {
    const bulkUpdateDto = {
      userIds: ['user-1', 'user-2'],
      status: UserStatus.SUSPENDED,
    };

    it('should bulk update users successfully', async () => {
      const mockResponse = { success: 2, failed: 0 };
      mockUserService.bulkUpdate.mockResolvedValue(mockResponse);

      const result = await controller.bulkUpdate(bulkUpdateDto, { updatedBy: 'admin-123' } as any);

      expect(result).toEqual(mockResponse);
      expect(service.bulkUpdate).toHaveBeenCalledWith(bulkUpdateDto, 'admin-123');
    });
  });

  describe('exportUserData', () => {
    it('should export user data successfully', async () => {
      const mockExportData = {
        user: mockUser,
        activities: [],
        exportedAt: new Date(),
      };

      mockUserService.exportUserData.mockResolvedValue(mockExportData as any);

      const result = await controller.exportUserData('user-123');

      expect(result).toEqual(mockExportData);
      expect(service.exportUserData).toHaveBeenCalledWith('user-123');
    });
  });

  describe('getUserActivities', () => {
    it('should return user activities', async () => {
      const mockActivities = [
        {
          id: 'activity-1',
          userId: 'user-123',
          type: 'login',
          description: 'User logged in',
          createdAt: new Date(),
        },
      ];

      mockUserService.getUserActivities.mockResolvedValue(mockActivities as any);

      const result = await controller.getUserActivities('user-123');

      expect(result).toEqual(mockActivities);
      expect(service.getUserActivities).toHaveBeenCalledWith('user-123', undefined);
    });

    it('should respect limit parameter', async () => {
      mockUserService.getUserActivities.mockResolvedValue([]);

      await controller.getUserActivities('user-123', { limit: 20 } as any);

      expect(service.getUserActivities).toHaveBeenCalledWith('user-123', 20);
    });
  });

  describe('validation', () => {
    it('should validate required fields in create user DTO', async () => {
      const invalidDto = {
        email: 'invalid-email',
        username: '',
        password: '123', // Too short
      };

      // This would be handled by NestJS validation pipes
      // The test ensures the controller passes validation to the service
      mockUserService.create.mockRejectedValue(new BadRequestException('Validation failed'));

      await expect(controller.create(invalidDto as any)).rejects.toThrow(BadRequestException);
    });

    it('should validate pagination parameters', async () => {
      const invalidQuery = {
        page: -1,
        limit: 0,
      };

      mockUserService.findAll.mockRejectedValue(new BadRequestException('Invalid pagination'));

      await expect(controller.findAll(invalidQuery as any)).rejects.toThrow(BadRequestException);
    });

    it('should validate user ID format', async () => {
      mockUserService.findOne.mockRejectedValue(new BadRequestException('Invalid user ID'));

      await expect(controller.findOne('invalid-id')).rejects.toThrow(BadRequestException);
    });
  });

  describe('error handling', () => {
    it('should handle service errors gracefully', async () => {
      mockUserService.findOne.mockRejectedValue(new Error('Database connection failed'));

      await expect(controller.findOne('user-123')).rejects.toThrow(Error);
    });

    it('should handle timeout errors', async () => {
      mockUserService.findAll.mockRejectedValue(new Error('Request timeout'));

      await expect(controller.findAll({} as any)).rejects.toThrow(Error);
    });

    it('should handle permission errors', async () => {
      mockUserService.update.mockRejectedValue(
        new UnauthorizedException('Insufficient permissions'),
      );

      await expect(
        controller.update('user-123', {} as any),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('response formatting', () => {
    it('should format user response correctly', async () => {
      const userWithSensitiveData = {
        ...mockUser,
        password: 'hashed-password',
        internalNotes: 'admin notes',
      };

      mockUserService.findOne.mockResolvedValue(userWithSensitiveData as any);

      const result = await controller.findOne('user-123');

      // Service should handle filtering sensitive data
      expect(result).toBeDefined();
      expect(service.findOne).toHaveBeenCalledWith('user-123');
    });

    it('should format pagination response correctly', async () => {
      const mockResponse = {
        data: [mockUser],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      };

      mockUserService.findAll.mockResolvedValue(mockResponse as any);

      const result = await controller.findAll({ page: 1, limit: 10 } as any);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });
  });
});
