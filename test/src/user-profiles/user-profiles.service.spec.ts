import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProfilesService } from './user-profiles.service';
import { UserProfile } from './entities/user-profile.entity';
import { User } from '../users/entities/user.entity';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const createMockRepository = <T = any>(): MockRepository<T> => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
});

describe('UserProfilesService', () => {
  let service: UserProfilesService;
  let userProfileRepository: MockRepository<UserProfile>;
  let userRepository: MockRepository<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserProfilesService,
        {
          provide: getRepositoryToken(UserProfile),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(User),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<UserProfilesService>(UserProfilesService);
    userProfileRepository = module.get<MockRepository<UserProfile>>(
      getRepositoryToken(UserProfile),
    );
    userRepository = module.get<MockRepository<User>>(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new profile', async () => {
      const userId = 'user-id';
      const createDto = { firstName: 'John', lastName: 'Doe' };
      const user = { id: userId };
      const profile = { id: 'profile-id', ...createDto, userId };

      userRepository.findOne.mockResolvedValue(user);
      userProfileRepository.findOne.mockResolvedValue(null);
      userProfileRepository.create.mockReturnValue(profile);
      userProfileRepository.save.mockResolvedValue(profile);

      const result = await service.create(userId, createDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(userProfileRepository.findOne).toHaveBeenCalledWith({
        where: { userId },
      });
      expect(userProfileRepository.create).toHaveBeenCalledWith({
        ...createDto,
        userId,
      });
      expect(userProfileRepository.save).toHaveBeenCalledWith(profile);
      expect(result).toEqual(profile);
    });

    it('should throw NotFoundException if user not found', async () => {
      const userId = 'user-id';
      const createDto = { firstName: 'John', lastName: 'Doe' };

      userRepository.findOne.mockResolvedValue(null);

      await expect(service.create(userId, createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if profile already exists', async () => {
      const userId = 'user-id';
      const createDto = { firstName: 'John', lastName: 'Doe' };
      const user = { id: userId };
      const existingProfile = { id: 'profile-id' };

      userRepository.findOne.mockResolvedValue(user);
      userProfileRepository.findOne.mockResolvedValue(existingProfile);

      await expect(service.create(userId, createDto)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('findAll', () => {
    it('should return an array of public profiles', async () => {
      const profiles = [{ id: 'profile-id', isPublic: true }];
      userProfileRepository.find.mockResolvedValue(profiles);

      const result = await service.findAll();

      expect(userProfileRepository.find).toHaveBeenCalledWith({
        where: { isPublic: true },
        select: [
          'id',
          'firstName',
          'lastName',
          'bio',
          'avatarUrl',
          'createdAt',
          'updatedAt',
        ],
      });
      expect(result).toEqual(profiles);
    });
  });

  describe('findOne', () => {
    it('should return a profile by id', async () => {
      const id = 'profile-id';
      const profile = { id };

      userProfileRepository.findOne.mockResolvedValue(profile);

      const result = await service.findOne(id);

      expect(userProfileRepository.findOne).toHaveBeenCalledWith({
        where: { id },
      });
      expect(result).toEqual(profile);
    });

    it('should throw NotFoundException if profile not found', async () => {
      const id = 'profile-id';

      userProfileRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(id)).rejects.toThrow(NotFoundException);
    });
  });

  // Add more tests for other methods...
});
