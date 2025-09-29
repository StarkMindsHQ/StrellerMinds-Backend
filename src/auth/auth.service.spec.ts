import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { IAuthStrategy } from './strategies/auth-strategy.interface';

describe('AuthService', () => {
  let service: AuthService;

  const mockGoogle: IAuthStrategy = {
    name: 'google',
    validate: jest.fn().mockResolvedValue({ email: 'test@gmail.com' }),
    login: jest.fn().mockResolvedValue({ token: 'jwt-token' }),
    register: jest.fn().mockResolvedValue({ token: 'registered-token' }),
  };

  const mockFacebook: IAuthStrategy = {
    name: 'facebook',
    validate: jest.fn().mockResolvedValue({ email: 'fb@test.com' }),
    login: jest.fn().mockResolvedValue({ token: 'fb-token' }),
    // No register method -> will trigger BadRequestException
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: 'AUTH_STRATEGIES', useValue: [mockGoogle, mockFacebook] },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getStrategy', () => {
    it('should return strategy if found', () => {
      const strategy = (service as any).getStrategy('google');
      expect(strategy).toBe(mockGoogle);
    });

    it('should throw BadRequestException if strategy not found', () => {
      expect(() => (service as any).getStrategy('apple')).toThrow(BadRequestException);
    });
  });

  describe('validate', () => {
    it('should call validate on the correct strategy', async () => {
      const result = await service.validate('google', {});
      expect(mockGoogle.validate).toHaveBeenCalledWith({});
      expect(result).toEqual({ email: 'test@gmail.com' });
    });

    it('should throw BadRequestException for unsupported strategy', async () => {
      await expect(service.validate('apple', {})).rejects.toThrow(BadRequestException);
    });

    it('should throw if validate rejects inside strategy', async () => {
      (mockGoogle.validate as jest.Mock).mockRejectedValueOnce(new UnauthorizedException('Invalid creds'));
      await expect(service.validate('google', {})).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('login', () => {
    it('should call login on the correct strategy', async () => {
      const result = await service.login('facebook', { id: 1 });
      expect(mockFacebook.login).toHaveBeenCalledWith({ id: 1 });
      expect(result).toEqual({ token: 'fb-token' });
    });

    it('should throw BadRequestException for unsupported strategy', async () => {
      await expect(service.login('apple', {})).rejects.toThrow(BadRequestException);
    });

    it('should throw if login rejects inside strategy', async () => {
      (mockFacebook.login as jest.Mock).mockRejectedValueOnce(new UnauthorizedException('Login failed'));
      await expect(service.login('facebook', { id: 1 })).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('register', () => {
    it('should call register if supported', async () => {
      const result = await service.register('google', { email: 'new@test.com' });
      expect(mockGoogle.register).toHaveBeenCalledWith({ email: 'new@test.com' });
      expect(result).toEqual({ token: 'registered-token' });
    });

    it('should throw BadRequestException if register not supported', async () => {
      await expect(service.register('facebook', {})).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for unsupported strategy', async () => {
      await expect(service.register('apple', {})).rejects.toThrow(BadRequestException);
    });

    it('should throw if register rejects inside strategy', async () => {
      (mockGoogle.register as jest.Mock).mockRejectedValueOnce(new UnauthorizedException('Registration failed'));
      await expect(service.register('google', { email: 'fail@test.com' }))
        .rejects.toThrow(UnauthorizedException);
    });
  });
});
