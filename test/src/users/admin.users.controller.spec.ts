import { Test, TestingModule } from '@nestjs/testing';
import { AdminUsersController } from './admin.users.controller';
import { UsersService } from './services/users.service';
import { AuditLogService } from '../audit/services/audit.log.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';

describe('AdminUsersController', () => {
  let controller: AdminUsersController;
  let usersService: UsersService;
  let auditLogService: AuditLogService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminUsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: AuditLogService,
          useValue: {
            createLog: jest.fn(),
          },
        },
        // Mock all external dependencies required by UsersService
        { provide: require.resolve('src/cloudinary/cloudinary.service'), useValue: {} },
        { provide: require.resolve('src/email/email.service'), useValue: {} },
        { provide: require.resolve('@nestjs/config'), useValue: {} },
        {
          provide: getRepositoryToken(User),
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<AdminUsersController>(AdminUsersController);
    usersService = module.get<UsersService>(UsersService);
    auditLogService = module.get<AuditLogService>(AuditLogService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // Add more tests for each endpoint as needed
});
