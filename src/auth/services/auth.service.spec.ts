import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../services/auth.service';
import { BcryptService } from '../services/bcrypt.service';
import { JwtService } from '../services/jwt.service';
import { EmailService } from '../services/email.service';
import { Repository } from 'typeorm';
import { User, UserRole, UserStatus } from '../entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RegisterDto } from '../dto/auth.dto';
import { ConflictException, UnauthorizedException, NotFoundException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: Repository<User>;
  let refreshTokenRepository: Repository<RefreshToken>;
  let bcryptService: BcryptService;
  let jwtService: JwtService;
  let emailService: EmailService;

  const mockUser: Partial<User> = {
    id: 'test-id',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.STUDENT,
    status: UserStatus.ACTIVE,
    isEmailVerified: true,
    password: 'hashedPassword',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: BcryptService,
          useValue: {
            hash: jest.fn(),
            compare: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAccessToken: jest.fn(),
            signRefreshToken: jest.fn(),
            verifyAccessToken: jest.fn(),
            verifyRefreshToken: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendEmailVerification: jest.fn(),
            sendPasswordReset: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    refreshTokenRepository = module.get<Repository<RefreshToken>>(getRepositoryToken(RefreshToken));
    bcryptService = module.get<BcryptService>(BcryptService);
    jwtService = module.get<JwtService>(JwtService);
    emailService = module.get<EmailService>(EmailService);
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'test@example.com',
      password: 'Password123!',
      firstName: 'John',
      lastName: 'Doe',
      role: UserRole.STUDENT,
    };

    it('should register a new user successfully', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(bcryptService, 'hash').mockResolvedValue('hashedPassword');
      jest.spyOn(userRepository, 'create').mockReturnValue(mockUser as User);
      jest.spyOn(userRepository, 'save').mockResolvedValue(mockUser as User);

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('message');
      expect(result.message).toContain('Registration successful');
      expect(bcryptService.hash).toHaveBeenCalledWith(registerDto.password);
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if user already exists', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as User);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'Password123!',
    };

    it('should login user successfully', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as User);
      jest.spyOn(bcryptService, 'compare').mockResolvedValue(true);
      jest.spyOn(jwtService, 'signAccessToken').mockResolvedValue('accessToken');
      jest.spyOn(jwtService, 'signRefreshToken').mockResolvedValue('refreshToken');
      jest.spyOn(refreshTokenRepository, 'create').mockReturnValue({} as RefreshToken);
      jest.spyOn(refreshTokenRepository, 'save').mockResolvedValue({} as RefreshToken);

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(bcryptService.compare).toHaveBeenCalledWith(loginDto.password, mockUser.password);
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for unverified email', async () => {
      const unverifiedUser = { ...mockUser, status: UserStatus.PENDING };
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(unverifiedUser as User);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('forgotPassword', () => {
    it('should send password reset email for existing user', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as User);
      jest.spyOn(userRepository, 'update').mockResolvedValue(undefined);

      await service.forgotPassword('test@example.com');

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
      expect(userRepository.update).toHaveBeenCalled();
    });

    it('should not throw error for non-existing user', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.forgotPassword('nonexistent@example.com')).resolves.toBeUndefined();
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      const userWithResetToken = {
        ...mockUser,
        passwordResetToken: 'reset-token',
        passwordResetExpires: new Date(Date.now() + 3600000),
      };
      
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(userWithResetToken as User);
      jest.spyOn(bcryptService, 'hash').mockResolvedValue('newHashedPassword');
      jest.spyOn(userRepository, 'update').mockResolvedValue(undefined);
      jest.spyOn(refreshTokenRepository, 'update').mockResolvedValue(undefined);

      await service.resetPassword('reset-token', 'NewPassword123!');

      expect(bcryptService.hash).toHaveBeenCalledWith('NewPassword123!');
      expect(userRepository.update).toHaveBeenCalled();
    });

    it('should throw error for invalid reset token', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.resetPassword('invalid-token', 'NewPassword123!')).rejects.toThrow(NotFoundException);
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      const userWithVerificationToken = {
        ...mockUser,
        emailVerificationToken: 'verification-token',
      };
      
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(userWithVerificationToken as User);
      jest.spyOn(userRepository, 'update').mockResolvedValue(undefined);

      await service.verifyEmail('verification-token');

      expect(userRepository.update).toHaveBeenCalledWith(mockUser.id, {
        isEmailVerified: true,
        emailVerificationToken: null,
        status: UserStatus.ACTIVE,
      });
    });

    it('should throw error for invalid verification token', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.verifyEmail('invalid-token')).rejects.toThrow(NotFoundException);
    });
  });
});
