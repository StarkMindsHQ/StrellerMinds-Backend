import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { UsersService } from '../../../src/users/users.service';
import { User } from '../../../src/users/entities/user.entity';
import { UserRole } from '../../../src/users/enums/user-role.enum';
import { userFactory } from '../../factories';
describe('UsersService', () => {
    let service;
    let repository;
    const mockUser = userFactory.create();
    const mockUsers = userFactory.createMany(5);
    beforeEach(async () => {
        const module = await Test.createTestingModule({
            providers: [
                UsersService,
                {
                    provide: getRepositoryToken(User),
                    useValue: {
                        find: jest.fn(),
                        findOne: jest.fn(),
                        findOneBy: jest.fn(),
                        create: jest.fn(),
                        save: jest.fn(),
                        update: jest.fn(),
                        delete: jest.fn(),
                        count: jest.fn(),
                        createQueryBuilder: jest.fn(),
                    },
                },
            ],
        }).compile();
        service = module.get(UsersService);
        repository = module.get(getRepositoryToken(User));
    });
    it('should be defined', () => {
        expect(service).toBeDefined();
    });
    describe('create', () => {
        const createUserDto = {
            email: 'test@example.com',
            password: 'password123',
            name: 'Test User',
            firstName: 'Test',
            lastName: 'User',
        };
        it('should create a new user', async () => {
            jest.spyOn(repository, 'findOne').mockResolvedValue(null);
            jest.spyOn(repository, 'create').mockReturnValue(mockUser);
            jest.spyOn(repository, 'save').mockResolvedValue(mockUser);
            const result = await service.create(createUserDto);
            expect(result).toEqual(mockUser);
            expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
                email: createUserDto.email,
                name: createUserDto.name,
            }));
            expect(repository.save).toHaveBeenCalledWith(mockUser);
        });
        it('should throw ConflictException when email already exists', async () => {
            jest.spyOn(repository, 'findOne').mockResolvedValue(mockUser);
            await expect(service.create(createUserDto)).rejects.toThrow(ConflictException);
            expect(repository.save).not.toHaveBeenCalled();
        });
        it('should hash password before saving', async () => {
            jest.spyOn(repository, 'findOne').mockResolvedValue(null);
            jest.spyOn(repository, 'create').mockReturnValue(mockUser);
            jest.spyOn(repository, 'save').mockResolvedValue(mockUser);
            await service.create(createUserDto);
            expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
                password: expect.not.stringMatching(createUserDto.password),
            }));
        });
    });
    describe('findAll', () => {
        it('should return paginated users', async () => {
            const mockQueryBuilder = {
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getManyAndCount: jest.fn().mockResolvedValue([mockUsers, mockUsers.length]),
            };
            jest.spyOn(repository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder);
            const result = await service.findAll({ page: 1, limit: 10 });
            expect(result).toEqual({
                data: mockUsers,
                total: mockUsers.length,
                page: 1,
                limit: 10,
                totalPages: 1,
            });
        });
        it('should filter by role when provided', async () => {
            const mockQueryBuilder = {
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getManyAndCount: jest.fn().mockResolvedValue([mockUsers, mockUsers.length]),
            };
            jest.spyOn(repository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder);
            await service.findAll({ page: 1, limit: 10, role: UserRole.INSTRUCTOR });
            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('user.role = :role', {
                role: UserRole.INSTRUCTOR,
            });
        });
        it('should search by name or email when search term provided', async () => {
            const mockQueryBuilder = {
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getManyAndCount: jest.fn().mockResolvedValue([mockUsers, mockUsers.length]),
            };
            jest.spyOn(repository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder);
            await service.findAll({ page: 1, limit: 10, search: 'john' });
            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('(user.name ILIKE :search OR user.email ILIKE :search)', { search: '%john%' });
        });
    });
    describe('findById', () => {
        it('should return user when found', async () => {
            jest.spyOn(repository, 'findOne').mockResolvedValue(mockUser);
            const result = await service.findById(mockUser.id);
            expect(result).toEqual(mockUser);
            expect(repository.findOne).toHaveBeenCalledWith({
                where: { id: mockUser.id },
            });
        });
        it('should throw NotFoundException when user not found', async () => {
            jest.spyOn(repository, 'findOne').mockResolvedValue(null);
            await expect(service.findById('non-existent-id')).rejects.toThrow(NotFoundException);
        });
    });
    describe('findByEmail', () => {
        it('should return user when found', async () => {
            jest.spyOn(repository, 'findOne').mockResolvedValue(mockUser);
            const result = await service.findByEmail(mockUser.email);
            expect(result).toEqual(mockUser);
            expect(repository.findOne).toHaveBeenCalledWith({
                where: { email: mockUser.email },
            });
        });
        it('should return null when user not found', async () => {
            jest.spyOn(repository, 'findOne').mockResolvedValue(null);
            const result = await service.findByEmail('nonexistent@test.com');
            expect(result).toBeNull();
        });
    });
    describe('update', () => {
        const updateData = {
            name: 'Updated Name',
            bio: 'Updated bio',
        };
        it('should update user successfully', async () => {
            const updatedUser = { ...mockUser, ...updateData };
            jest.spyOn(repository, 'findOne').mockResolvedValue(mockUser);
            jest.spyOn(repository, 'save').mockResolvedValue(updatedUser);
            const result = await service.update(mockUser.id, updateData);
            expect(result).toEqual(updatedUser);
            expect(repository.save).toHaveBeenCalledWith(expect.objectContaining(updateData));
        });
        it('should throw NotFoundException when user not found', async () => {
            jest.spyOn(repository, 'findOne').mockResolvedValue(null);
            await expect(service.update('non-existent-id', updateData)).rejects.toThrow(NotFoundException);
        });
        it('should hash password when updating password', async () => {
            const passwordUpdate = { password: 'newpassword123' };
            jest.spyOn(repository, 'findOne').mockResolvedValue(mockUser);
            jest.spyOn(repository, 'save').mockResolvedValue(mockUser);
            await service.update(mockUser.id, passwordUpdate);
            expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({
                password: expect.not.stringMatching(passwordUpdate.password),
            }));
        });
    });
    describe('delete', () => {
        it('should delete user successfully', async () => {
            jest.spyOn(repository, 'findOne').mockResolvedValue(mockUser);
            jest.spyOn(repository, 'delete').mockResolvedValue({ affected: 1 });
            await service.delete(mockUser.id);
            expect(repository.delete).toHaveBeenCalledWith(mockUser.id);
        });
        it('should throw NotFoundException when user not found', async () => {
            jest.spyOn(repository, 'findOne').mockResolvedValue(null);
            await expect(service.delete('non-existent-id')).rejects.toThrow(NotFoundException);
        });
    });
    describe('getUserStats', () => {
        it('should return user statistics', async () => {
            const mockStats = {
                totalUsers: 100,
                activeUsers: 80,
                newUsersThisMonth: 15,
                usersByRole: {
                    [UserRole.ADMIN]: 5,
                    [UserRole.INSTRUCTOR]: 20,
                    [UserRole.STUDENT]: 75,
                },
            };
            const mockQueryBuilder = {
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                groupBy: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValue([
                    { role: UserRole.ADMIN, count: '5' },
                    { role: UserRole.INSTRUCTOR, count: '20' },
                    { role: UserRole.STUDENT, count: '75' },
                ]),
            };
            jest.spyOn(repository, 'count')
                .mockResolvedValueOnce(100) // total users
                .mockResolvedValueOnce(80) // active users
                .mockResolvedValueOnce(15); // new users this month
            jest.spyOn(repository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder);
            const result = await service.getUserStats();
            expect(result).toEqual(mockStats);
        });
    });
    describe('verifyEmail', () => {
        it('should verify user email with valid token', async () => {
            const unverifiedUser = userFactory.unverified();
            const verifiedUser = { ...unverifiedUser, isEmailVerified: true };
            jest.spyOn(repository, 'findOne').mockResolvedValue(unverifiedUser);
            jest.spyOn(repository, 'save').mockResolvedValue(verifiedUser);
            const result = await service.verifyEmail(unverifiedUser.emailVerificationToken);
            expect(result).toEqual(verifiedUser);
            expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({
                isEmailVerified: true,
                emailVerificationToken: null,
                emailVerificationExpires: null,
            }));
        });
        it('should throw error for invalid verification token', async () => {
            jest.spyOn(repository, 'findOne').mockResolvedValue(null);
            await expect(service.verifyEmail('invalid-token')).rejects.toThrow(NotFoundException);
        });
    });
});
