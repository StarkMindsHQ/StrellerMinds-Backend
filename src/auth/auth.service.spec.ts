import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/services/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PasswordValidationService } from './password-validation.service';
import { EmailService } from '../email/email.service';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;
  let configService: ConfigService;
  let passwordValidationService: PasswordValidationService;
  let emailService: EmailService;

  const mockUser = {
    id: '1',
    email: 'test@example.com',
    password: 'hashedPassword',
    roles: ['STUDENT'],
    isEmailVerified: true,
  };

  const mockTokens = {
    accessToken: 'mockAccessToken',
    refreshToken: 'mockRefreshToken',
    expiresIn: 3600,
  };

  beforeEach(async () => {
    const usersServiceMock = {
      findOne: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      updatePassword: jest.fn(),
      updateRefreshToken: jest.fn(),
      userRepository: {},
    };

    const jwtServiceMock = {
      sign: jest.fn().mockReturnValue('test-token'),
      verify: jest.fn().mockReturnValue({ sub: 'test-id' }),
      signAsync: jest.fn(),
      verifyAsync: jest.fn(),
      options: {},
      logger: {
        error: jest.fn(),
        warn: jest.fn(),
        log: jest.fn(),
      },
      mergeJwtOptions: jest.fn(),
      overrideSecretFromOptions: jest.fn(),
      getSecretKey: jest.fn(),
    };

    const configServiceMock = {
      get: jest.fn().mockReturnValue('testSecret'),
    };

    const passwordValidationServiceMock = {
      validatePassword: jest.fn(),
      MIN_LENGTH: 8,
      MIN_SCORE: 3,
    };

    const emailServiceMock = {
      sendEmail: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersServiceMock },
        { provide: JwtService, useValue: jwtServiceMock },
        { provide: ConfigService, useValue: configServiceMock },
        { provide: EmailService, useValue: emailServiceMock },
        {
          provide: PasswordValidationService,
          useValue: passwordValidationServiceMock,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
    passwordValidationService = module.get<PasswordValidationService>(
      PasswordValidationService,
    );
    emailService = module.get<EmailService>(EmailService);

    (bcrypt.compare as jest.Mock).mockImplementation((plainText, hash) =>
      Promise.resolve(plainText === 'correctPassword'),
    );
    (bcrypt.hash as jest.Mock).mockImplementation((text) =>
      Promise.resolve(`hashed-${text}`),
    );
  });
});

describe('AuthService', () => {
  let service: AuthService;

  const mockGoogle = {
    name: 'google',
    validate: jest.fn().mockResolvedValue({ email: 'test@gmail.com' }),
    login: jest.fn().mockResolvedValue({ token: 'jwt-token' }),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: 'AUTH_STRATEGIES', useValue: [mockGoogle] },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should validate with Google', async () => {
    const result = await service.validate('google', {});
    expect(result).toEqual({ email: 'test@gmail.com' });
  });

  it('should fail for missing strategy', async () => {
    await expect(service.login('facebook', {})).rejects.toThrow(
      /Strategy for facebook not found/,
    );
  });
});
