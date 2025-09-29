import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: JwtService;
  let reflector: Reflector;

  const mockContext = {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: {
          authorization: 'Bearer validToken',
        },
      }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: JwtService,
          useValue: {
            verify: jest.fn(),
          },
        },
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    jwtService = module.get<JwtService>(JwtService);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should allow access to public routes', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      const result = await guard.canActivate(mockContext);
      expect(result).toBe(true);
    });

    it('should validate token for protected routes', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest.spyOn(jwtService, 'verify').mockReturnValue({ sub: '1' });

      const result = await guard.canActivate(mockContext);
      expect(result).toBe(true);
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest.spyOn(jwtService, 'verify').mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(guard.canActivate(mockContext)).rejects.toThrow();
    });
  });

  describe('handleRequest', () => {
    it('should return user for valid token', () => {
      const user = { sub: '1', email: 'test@example.com' };
      const result = guard.handleRequest(null, user, null);
      expect(result).toEqual(user);
    });

    it('should throw UnauthorizedException for expired token', () => {
      const error = { name: 'TokenExpiredError' };
      expect(() => guard.handleRequest(null, null, error)).toThrow(
        'Token has expired',
      );
    });

    it('should throw UnauthorizedException for invalid token', () => {
      expect(() => guard.handleRequest(new Error(), null, null)).toThrow(
        'Invalid token',
      );
    });
  });
});
