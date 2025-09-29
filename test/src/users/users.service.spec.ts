import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from './enums/userRole.enum';
import { AccountStatus } from './enums/accountStatus.enum';

const mockUser: Partial<User> = {
  id: '1',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  profileImageUrl: 'image.jpg',
  password: 'hashedPassword123',
  isInstructor: false,
  bio: 'Test bio',
  role: UserRole.STUDENT,
  status: AccountStatus.ACTIVE,
  username: 'testuser',
  isEmailVerified: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('UsersService', () => {
  let service: UsersService;
  let repo: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            findAndCount: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repo = module.get(getRepositoryToken(User));
  });

  describe('create', () => {
    it('should create and return a new user if email does not exist', async () => {
      repo.findOne.mockResolvedValue(null);
      repo.create.mockReturnValue(mockUser as User);
      repo.save.mockResolvedValue(mockUser as User);

      const result = await service.create({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        password: 'password123',
        profileImageUrl: 'image.jpg',
      });

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        select: ['id', 'email'],
      });
      expect(repo.create).toHaveBeenCalled();
      expect(repo.save).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should throw ConflictException if user with email exists', async () => {
      repo.findOne.mockResolvedValue(mockUser as User);

      await expect(
        service.create({
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw InternalServerErrorException on other errors', async () => {
      repo.findOne.mockRejectedValue(new Error('DB error'));

      await expect(
        service.create({
          email: 'fail@example.com',
          firstName: 'Fail',
          lastName: 'User',
          password: 'password123',
        }),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const mockUsers = [mockUser];
      repo.findAndCount.mockResolvedValue([mockUsers as User[], 1]);

      const result = await service.findAll(1, 10);

      expect(repo.findAndCount).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        select: ['id', 'firstName', 'lastName', 'email', 'role', 'status', 'createdAt'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual({ users: mockUsers, total: 1 });
    });
  });

  describe('Performance Tests', () => {
    it('should perform findAll with pagination efficiently', async () => {
      const startTime = Date.now();
      
      repo.findAndCount.mockResolvedValue([[], 0]);
      
      await service.findAll(1, 10);
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      expect(executionTime).toBeLessThan(100);
    });

    it('should perform findOne with relations efficiently', async () => {
      const startTime = Date.now();
      
      repo.findOne.mockResolvedValue(mockUser as User);
      
      await service.findOne('test-id', ['profile', 'settings']);
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      expect(executionTime).toBeLessThan(100);
    });

    it('should handle concurrent requests efficiently', async () => {
      const startTime = Date.now();
      
      repo.findOne.mockResolvedValue(mockUser as User);
      
      const promises = Array(10).fill(null).map(() => 
        service.findOne('test-id')
      );
      
      await Promise.all(promises);
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      expect(executionTime).toBeLessThan(500);
    });
  });
});
