import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CreateUsersDto } from './dto/create-users.dto';

const mockUser = {
  id: '1',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  profileImageUrl: 'image.jpg',
};

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockUsersService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  describe('create', () => {
    it('should return created user from service', async () => {
      const dto: CreateUsersDto = {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      };
      const file = { path: 'image.jpg' } as Express.Multer.File;

      mockUsersService.create.mockResolvedValue(mockUser);

      const result = await controller.create(dto, file);

      expect(mockUsersService.create).toHaveBeenCalledWith(dto, file);
      expect(result).toEqual(mockUser);
    });
  });
});
