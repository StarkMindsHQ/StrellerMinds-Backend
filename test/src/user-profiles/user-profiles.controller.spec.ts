import { Test, TestingModule } from '@nestjs/testing';
import { UserProfilesController } from './user-profiles.controller';
import { UserProfilesService } from './user-profiles.service';
import { CreateUserProfileDto } from './dto/create-user-profile.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { UserProfile } from './entities/user-profile.entity';

describe('UserProfilesController', () => {
  let controller: UserProfilesController;
  let service: UserProfilesService;

  const mockUserId = 'user-123';
  const mockProfileId = 'profile-123';
  const mockProfile: UserProfile = {
    id: mockProfileId,
    firstName: 'John',
    lastName: 'Doe',
    bio: 'A short bio',
    avatarUrl: 'http://avatar.com/image.png',
    phoneNumber: '1234567890',
    address: '123 Main St',
    city: 'New York',
    country: 'USA',
    postalCode: '10001',
    dateOfBirth: new Date('1990-01-01'),
    isPublic: true,
    userId: mockUserId,
    user: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockService = {
    create: jest.fn().mockResolvedValue(mockProfile),
    findAll: jest.fn().mockResolvedValue([mockProfile]),
    findOne: jest.fn().mockResolvedValue(mockProfile),
    findByUserId: jest.fn().mockResolvedValue(mockProfile),
    update: jest.fn().mockResolvedValue(mockProfile),
    patch: jest.fn().mockResolvedValue(mockProfile),
    remove: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserProfilesController],
      providers: [
        {
          provide: UserProfilesService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<UserProfilesController>(UserProfilesController);
    service = module.get<UserProfilesService>(UserProfilesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new user profile', async () => {
      const dto: CreateUserProfileDto = { firstName: 'John' };
      const req = { user: { id: mockUserId } };
      const result = await controller.create(req, dto);
      expect(result).toEqual(mockProfile);
      expect(service.create).toHaveBeenCalledWith(mockUserId, dto);
    });
  });

  describe('findAll', () => {
    it('should return all public profiles', async () => {
      const result = await controller.findAll();
      expect(result).toEqual([mockProfile]);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a profile by id', async () => {
      const req = { user: { id: mockUserId } };
      const result = await controller.findOne(mockProfileId, req);
      expect(result).toEqual(mockProfile);
      expect(service.findOne).toHaveBeenCalledWith(mockProfileId);
    });
  });

  describe('findByUserId', () => {
    it('should return a profile by user id', async () => {
      const req = { user: { id: mockUserId } };
      const result = await controller.findByUserId(mockUserId, req);
      expect(result).toEqual(mockProfile);
      expect(service.findByUserId).toHaveBeenCalledWith(mockUserId, mockUserId);
    });
  });

  describe('update', () => {
    it('should update a profile', async () => {
      const dto: UpdateUserProfileDto = { firstName: 'Jane' };
      const req = { user: { id: mockUserId } };
      const result = await controller.update(mockProfileId, req, dto);
      expect(result).toEqual(mockProfile);
      expect(service.update).toHaveBeenCalledWith(mockProfileId, mockUserId, dto);
    });
  });

  describe('patch', () => {
    it('should partially update a profile', async () => {
      const dto: UpdateUserProfileDto = { bio: 'Updated bio' };
      const req = { user: { id: mockUserId } };
      const result = await controller.patch(mockProfileId, req, dto);
      expect(result).toEqual(mockProfile);
      expect(service.patch).toHaveBeenCalledWith(mockProfileId, mockUserId, dto);
    });
  });

  describe('remove', () => {
    it('should delete a profile', async () => {
      const req = { user: { id: mockUserId } };
      const result = await controller.remove(mockProfileId, req);
      expect(result).toBeUndefined();
      expect(service.remove).toHaveBeenCalledWith(mockProfileId, mockUserId);
    });
  });

  describe('adminRemove', () => {
    it('should allow an admin to delete a profile', async () => {
      const req = { user: { id: 'admin-id' } };
      const result = await controller.adminRemove(mockProfileId, req);
      expect(result).toBeUndefined();
      expect(service.remove).toHaveBeenCalledWith(mockProfileId, 'admin-id');
    });
  });
});
