import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Repository } from 'typeorm';
import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '../enums/userRole.enum';
import { AccountStatus } from '../enums/accountStatus.enum';
import { SharedUtilityService } from '../../common/services/shared-utility.service';
import { BaseService } from '../../common/services/base.service';

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

const mockCreateUserDto = {
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  password: 'Password123!',
  profileImageUrl: 'image.jpg',
  bio: 'Test bio',
};

describe('UsersService', () => {
  let service: UsersService;
  let repo: jest.Mocked<Repository<User>>;
  let sharedUtilityService: jest.Mocked<SharedUtilityService>;

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
            count: jest.fn(),
          },
        },
        {
          provide: SharedUtilityService,
          useValue: {
            isValidEmail: jest.fn(),
            validatePasswordStrength: jest.fn(),
            sanitizeInput: jest.fn(),
            removeEmptyValues: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repo = module.get(getRepositoryToken(User));
    sharedUtilityService = module.get(SharedUtilityService);
  });

  describe('create', () => {
    it('should create and return a new user if email does not exist', async () => {
      // Mock shared utility service
      sharedUtilityService.isValidEmail.mockReturnValue(true);
      sharedUtilityService.validatePasswordStrength.mockReturnValue({
        isValid: true,
        errors: [],
      });
      sharedUtilityService.sanitizeInput.mockImplementation((input) => input);

      // Mock repository
      repo.findOne.mockResolvedValue(null);
      repo.create.mockReturnValue(mockUser as User);
      repo.save.mockResolvedValue(mockUser as User);

      const result = await service.create(mockCreateUserDto);

      expect(sharedUtilityService.isValidEmail).toHaveBeenCalledWith('test@example.com');
      expect(sharedUtilityService.validatePasswordStrength).toHaveBeenCalledWith('Password123!');
      expect(sharedUtilityService.sanitizeInput).toHaveBeenCalledTimes(3); // firstName, lastName, bio
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        select: ['id', 'email'],
      });
      expect(repo.create).toHaveBeenCalled();
      expect(repo.save).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should throw ConflictException if user with email exists', async () => {
      sharedUtilityService.isValidEmail.mockReturnValue(true);
      sharedUtilityService.validatePasswordStrength.mockReturnValue({
        isValid: true,
        errors: [],
      });

      repo.findOne.mockResolvedValue(mockUser as User);

      await expect(service.create(mockCreateUserDto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if email format is invalid', async () => {
      sharedUtilityService.isValidEmail.mockReturnValue(false);

      await expect(service.create(mockCreateUserDto)).rejects.toThrow(ConflictException);
      expect(sharedUtilityService.isValidEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should throw ConflictException if password validation fails', async () => {
      sharedUtilityService.isValidEmail.mockReturnValue(true);
      sharedUtilityService.validatePasswordStrength.mockReturnValue({
        isValid: false,
        errors: ['Password must be at least 8 characters long'],
      });

      await expect(service.create(mockCreateUserDto)).rejects.toThrow(ConflictException);
      expect(sharedUtilityService.validatePasswordStrength).toHaveBeenCalledWith('Password123!');
    });

    it('should throw InternalServerErrorException on other errors', async () => {
      sharedUtilityService.isValidEmail.mockReturnValue(true);
      sharedUtilityService.validatePasswordStrength.mockReturnValue({
        isValid: true,
        errors: [],
      });

      repo.findOne.mockRejectedValue(new Error('DB error'));

      await expect(service.create(mockCreateUserDto)).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const mockUsers = [mockUser as User];
      const mockResult = {
        data: mockUsers,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      // Mock the base service method
      jest.spyOn(service as any, 'findEntitiesWithPagination').mockResolvedValue(mockResult);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result).toEqual(mockResult);
      expect((service as any).findEntitiesWithPagination).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        select: ['id', 'firstName', 'lastName', 'email', 'role', 'status', 'createdAt'],
        order: { createdAt: 'DESC' },
      });
    });

    it('should handle errors gracefully', async () => {
      jest.spyOn(service as any, 'findEntitiesWithPagination').mockRejectedValue(new Error('DB error'));

      await expect(service.findAll()).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('findOne', () => {
    it('should return user by ID', async () => {
      jest.spyOn(service as any, 'findEntityById').mockResolvedValue(mockUser as User);

      const result = await service.findOne('1');

      expect(result).toEqual(mockUser);
      expect((service as any).findEntityById).toHaveBeenCalledWith('1', []);
    });

    it('should return user with relations', async () => {
      jest.spyOn(service as any, 'findEntityById').mockResolvedValue(mockUser as User);

      const result = await service.findOne('1', ['profile', 'settings']);

      expect(result).toEqual(mockUser);
      expect((service as any).findEntityById).toHaveBeenCalledWith('1', ['profile', 'settings']);
    });

    it('should handle NotFoundException', async () => {
      jest.spyOn(service as any, 'findEntityById').mockRejectedValue(new NotFoundException('User not found'));

      await expect(service.findOne('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update user successfully', async () => {
      const updateDto = { firstName: 'Updated', lastName: 'Name' };
      const updatedUser = { ...mockUser, ...updateDto };

      sharedUtilityService.removeEmptyValues.mockReturnValue(updateDto);
      sharedUtilityService.sanitizeInput.mockImplementation((input) => input);
      jest.spyOn(service as any, 'updateEntity').mockResolvedValue(updatedUser as User);

      const result = await service.update('1', updateDto);

      expect(result).toEqual(updatedUser);
      expect(sharedUtilityService.removeEmptyValues).toHaveBeenCalledWith(updateDto);
      expect((service as any).updateEntity).toHaveBeenCalledWith('1', updateDto);
    });

    it('should handle NotFoundException', async () => {
      const updateDto = { firstName: 'Updated' };

      jest.spyOn(service as any, 'updateEntity').mockRejectedValue(new NotFoundException('User not found'));

      await expect(service.update('1', updateDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete user successfully', async () => {
      jest.spyOn(service as any, 'deleteEntity').mockResolvedValue(undefined);

      await service.delete('1');

      expect((service as any).deleteEntity).toHaveBeenCalledWith('1');
    });

    it('should handle NotFoundException', async () => {
      jest.spyOn(service as any, 'deleteEntity').mockRejectedValue(new NotFoundException('User not found'));

      await expect(service.delete('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEmail', () => {
    it('should return user if found', async () => {
      sharedUtilityService.isValidEmail.mockReturnValue(true);
      repo.findOne.mockResolvedValue(mockUser as User);

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(sharedUtilityService.isValidEmail).toHaveBeenCalledWith('test@example.com');
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        select: ['id', 'email', 'password', 'role', 'status'],
      });
    });

    it('should return undefined if email is invalid', async () => {
      sharedUtilityService.isValidEmail.mockReturnValue(false);

      const result = await service.findByEmail('invalid-email');

      expect(result).toBeUndefined();
      expect(sharedUtilityService.isValidEmail).toHaveBeenCalledWith('invalid-email');
    });

    it('should return undefined on error', async () => {
      sharedUtilityService.isValidEmail.mockReturnValue(true);
      repo.findOne.mockRejectedValue(new Error('DB error'));

      const result = await service.findByEmail('test@example.com');

      expect(result).toBeUndefined();
    });
  });

  describe('validateCredentials', () => {
    it('should return true for valid credentials', async () => {
      const user = { ...mockUser, password: 'hashedPassword123' };
      jest.spyOn(service, 'findByEmail').mockResolvedValue(user as User);

      // Mock bcrypt.compare (you might need to mock the bcrypt module)
      const bcrypt = require('bcrypt');
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

      const result = await service.validateCredentials('test@example.com', 'password123');

      expect(result).toBe(true);
      expect(service.findByEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should return false if user not found', async () => {
      jest.spyOn(service, 'findByEmail').mockResolvedValue(undefined);

      const result = await service.validateCredentials('test@example.com', 'password123');

      expect(result).toBe(false);
    });

    it('should return false if user has no password', async () => {
      const user = { ...mockUser, password: undefined };
      jest.spyOn(service, 'findByEmail').mockResolvedValue(user as User);

      const result = await service.validateCredentials('test@example.com', 'password123');

      expect(result).toBe(false);
    });
  });

  describe('findByCriteria', () => {
    it('should return users matching criteria', async () => {
      const criteria = { role: UserRole.STUDENT, status: AccountStatus.ACTIVE };
      const mockUsers = [mockUser as User];

      sharedUtilityService.sanitizeInput.mockImplementation((input) => input);
      repo.find.mockResolvedValue(mockUsers);

      const result = await service.findByCriteria(criteria);

      expect(result).toEqual(mockUsers);
      expect(sharedUtilityService.sanitizeInput).toHaveBeenCalledTimes(2); // role and status
      expect(repo.find).toHaveBeenCalledWith({
        where: criteria,
        select: ['id', 'firstName', 'lastName', 'email', 'role', 'status', 'createdAt'],
      });
    });

    it('should return empty array on error', async () => {
      const criteria = { role: UserRole.STUDENT };

      sharedUtilityService.sanitizeInput.mockImplementation((input) => input);
      repo.find.mockRejectedValue(new Error('DB error'));

      const result = await service.findByCriteria(criteria);

      expect(result).toEqual([]);
    });
  });
});
