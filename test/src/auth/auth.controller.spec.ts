import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { PasswordValidationService } from './password-validation.service';

// Create mock types to fix TypeScript errors
type MockAuthService = {
  validateUser: jest.Mock;
  login: jest.Mock;
  register: jest.Mock;
  refreshToken: jest.Mock;
  changePassword: jest.Mock;
};

describe('AuthController', () => {
  let controller: AuthController;
  let authService: MockAuthService;
  let passwordValidationService: PasswordValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            validateUser: jest.fn(),
            login: jest.fn(),
            register: jest.fn(),
            refreshToken: jest.fn(),
            changePassword: jest.fn(),
          }
        },
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({}),
          }
        },
        {
          provide: PasswordValidationService,
          useValue: {
            getPasswordRequirements: jest.fn().mockReturnValue([
              'At least 8 characters long',
              'Contains at least one uppercase letter',
              'Contains at least one lowercase letter',
              'Contains at least one number',
              'Contains at least one special character',
            ]),
          }
        }
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService) as unknown as MockAuthService;
    passwordValidationService = module.get<PasswordValidationService>(PasswordValidationService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should validate user and return login response', async () => {
      // Setup
      const mockUser = { id: 'user-id', email: 'test@example.com' };
      const mockLoginResponse = { access_token: 'token', refresh_token: 'refresh', expires_in: 3600, user: mockUser };

      authService.validateUser.mockResolvedValue(mockUser);
      authService.login.mockResolvedValue(mockLoginResponse);

      // Execute
      const result = await controller.login({ email: 'test@example.com', password: 'password' });

      // Assert
      expect(authService.validateUser).toHaveBeenCalledWith('test@example.com', 'password');
      expect(authService.login).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockLoginResponse);
    });

    it('should throw UnauthorizedException when user validation fails', async () => {
      // Setup
      authService.validateUser.mockResolvedValue(null);

      // Execute & Assert
      await expect(controller.login({ email: 'test@example.com', password: 'wrong' }))
        .rejects.toThrow(UnauthorizedException);

      expect(authService.login).not.toHaveBeenCalled();
    });
  });

  describe('register', () => {
    it('should call authService.register with correct parameters', async () => {
      // Setup
      const registerDto = {
        email: 'new@example.com',
        password: 'StrongP@ss123',
        firstName: 'John',
        lastName: 'Doe'
      };

      const mockResponse = { access_token: 'token', refresh_token: 'refresh', expires_in: 3600, user: { id: 'new-id', email: 'new@example.com' } };
      authService.register.mockResolvedValue(mockResponse);

      // Execute
      const result = await controller.register(registerDto);

      // Assert
      expect(authService.register).toHaveBeenCalledWith(
        'new@example.com',
        'StrongP@ss123',
        { firstName: 'John', lastName: 'Doe' }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should propagate BadRequestException from authService.register', async () => {
      // Setup
      authService.register.mockRejectedValue(new BadRequestException('Password does not meet requirements'));

      // Execute & Assert
      await expect(controller.register({ email: 'new@example.com', password: 'weak' }))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('getPasswordRequirements', () => {
    it('should return password requirements from passwordValidationService', () => {
      // Execute
      const result = controller.getPasswordRequirements();

      // Assert
      expect(passwordValidationService.getPasswordRequirements).toHaveBeenCalled();
      expect(result).toEqual({
        requirements: [
          'At least 8 characters long',
          'Contains at least one uppercase letter',
          'Contains at least one lowercase letter',
          'Contains at least one number',
          'Contains at least one special character',
        ]
      });
    });
  });

  describe('refresh', () => {
    it('should call authService.refreshToken with userId and refreshToken', async () => {
      // Setup
      const mockTokens = { accessToken: 'new-token', refreshToken: 'new-refresh' };
      authService.refreshToken.mockResolvedValue(mockTokens);

      // Execute
      const result = await controller.refresh({ userId: 'user-id', refreshToken: 'refresh-token' });

      // Assert
      expect(authService.refreshToken).toHaveBeenCalledWith('user-id', 'refresh-token');
      expect(result).toEqual(mockTokens);
    });

    it('should throw UnauthorizedException when userId or refreshToken is missing', async () => {
      // Execute & Assert
      await expect(controller.refresh({ userId: 'user-id', refreshToken: undefined } as any))
        .rejects.toThrow(UnauthorizedException);

      await expect(controller.refresh({ userId: undefined, refreshToken: 'refresh-token' } as any))
        .rejects.toThrow(UnauthorizedException);

      await expect(controller.refresh({} as any))
        .rejects.toThrow(UnauthorizedException);

      expect(authService.refreshToken).not.toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    it('should call authService.changePassword with correct parameters', async () => {
      // Setup
      const req = { user: { id: 'user-id' } };
      const changePasswordDto = {
        currentPassword: 'currentPass',
        newPassword: 'NewStrongP@ss123'
      };
      authService.changePassword.mockResolvedValue(true);

      // Execute
      const result = await controller.changePassword(req, changePasswordDto);

      // Assert
      expect(authService.changePassword).toHaveBeenCalledWith(
        'user-id',
        'currentPass',
        'NewStrongP@ss123'
      );
      expect(result).toBe(true);
    });

    it('should throw BadRequestException when passwords are missing', async () => {
      // Setup
      const req = { user: { id: 'user-id' } };

      // Execute & Assert
      await expect(controller.changePassword(req, { currentPassword: 'current', newPassword: undefined } as any))
        .rejects.toThrow(BadRequestException);

      await expect(controller.changePassword(req, { currentPassword: undefined, newPassword: 'new' } as any))
        .rejects.toThrow(BadRequestException);

      await expect(controller.changePassword(req, {} as any))
        .rejects.toThrow(BadRequestException);

      expect(authService.changePassword).not.toHaveBeenCalled();
    });
  });
});