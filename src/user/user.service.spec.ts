import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserService } from './user.service';
import { User, UserStatus, UserRole } from './entities/user.entity';
import { UserActivity } from './entities/user-activity.entity';
import { ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('UserService', () => {
  let service: UserService;
  let userRepository: Repository<User>;
  let activityRepository: Repository<UserActivity>;

  const mockUser: Partial<User> = {
    id: '123',
    email: 'test@example.com',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    password: 'hashedPassword',
    status: UserStatus.ACTIVE,
    roles: [UserRole.USER],
    emailVerified: false,
    loginCount: 0,
    failedLoginAttempts: 0,
    twoFactorEnabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    fullName: 'Test User',
    hasRole: jest.fn(),
    hasPermission: jest.fn(),
    isActive: jest.fn(),
    isAccountLocked: jest.fn(),
  };

  const mockUserRepository = {
    create: jest.fn<any, any>(),
    save: jest.fn<Promise<Partial<User>>, any>(),
    findOne: jest.fn<Promise<Partial<User> | null>, any>(),
    find: jest.fn<Promise<Partial<User>[]>, any>(),
    softDelete: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getCount: jest.fn(),
      getMany: jest.fn(),
    })),
  };

  const mockActivityRepository = {
    create: jest.fn<any, any>(),
    save: jest.fn<Promise<Partial<UserActivity>>, any>(),
    find: jest.fn<Promise<Partial<UserActivity>[]>, any>(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        {
          provide: getRepositoryToken(UserActivity),
          useValue: mockActivityRepository,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepository = module.get(getRepositoryToken(User));
    activityRepository = module.get(getRepositoryToken(UserActivity));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new user successfully', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);
      mockActivityRepository.create.mockReturnValue({});
      mockActivityRepository.save.mockResolvedValue({});

      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashedPassword' as never);

      const result = await service.create({
        email: 'new@example.com',
        username: 'newuser',
        password: 'Password123!',
        firstName: 'New',
        lastName: 'User',
      });

      expect(result.email).toBe(mockUser.email);
    });

    it('should throw ConflictException if email exists', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(
        service.create({
          email: 'test@example.com',
          username: 'newuser',
          password: 'Password123!',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findOne', () => {
    it('should return user', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findOne('123');
      expect(result.id).toBe('123');
    });

    it('should throw if not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
    });
  });
});
