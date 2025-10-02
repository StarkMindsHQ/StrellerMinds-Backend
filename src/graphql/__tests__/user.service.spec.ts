import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { jest } from '@jest/globals';

import { UserService } from '../modules/user/services/user.service';
import { User } from '../modules/user/entities/user.entity';

describe('UserService', () => {
  let service: UserService;
  let repository: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            createQueryBuilder: jest.fn(),
            findOne: jest.fn(),
            findByIds: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findById', () => {
    it('should return a user by id', async () => {
      const mockUser: User = {
        id: '1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        isActive: true,
        posts: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as User;

      repository.findOne.mockResolvedValue(mockUser);

      const result = await service.findById('1');

      expect(result).toEqual(mockUser);
      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
    });
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const input = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      const mockUser: User = {
        id: '1',
        ...input,
        isActive: true,
        posts: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as User;

      repository.create.mockReturnValue(mockUser);
      repository.save.mockResolvedValue(mockUser);

      const result = await service.create(input);

      expect(result).toEqual(mockUser);
      expect(repository.create).toHaveBeenCalledWith(input);
      expect(repository.save).toHaveBeenCalledWith(mockUser);
    });
  });
});
