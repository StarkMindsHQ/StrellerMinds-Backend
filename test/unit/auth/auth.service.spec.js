import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../../../src/auth/auth.service';
import { UsersService } from '../../../src/users/users.service';
import { RefreshToken } from '../../../src/auth/entities/refresh-token.entity';
import { userFactory } from '../../factories';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
describe('AuthService', () => {
    let service;
    let usersService;
    let jwtService;
    let refreshTokenRepository;
    let configService;
    const mockUser = userFactory.forAuth('password123');
    const mockRefreshToken = {
        id: 'refresh-token-id',
        token: 'refresh-token',
        user: mockUser,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    beforeEach(async () => {
        const module = await Test.createTestingModule({
            providers: [
                AuthService,
                {
                    provide: UsersService,
                    useValue: {
                        findByEmail: jest.fn(),
                        create: jest.fn(),
                        findById: jest.fn(),
                        update: jest.fn(),
                    },
                },
                {
                    provide: JwtService,
                    useValue: {
                        sign: jest.fn(),
                        verify: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(RefreshToken),
                    useValue: {
                        create: jest.fn(),
                        save: jest.fn(),
                        findOne: jest.fn(),
                        delete: jest.fn(),
                        createQueryBuilder: jest.fn(),
                    },
                },
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn((key) => {
                            const config = {
                                JWT_SECRET: 'test-secret',
                                JWT_EXPIRES_IN: '15m',
                                JWT_REFRESH_SECRET: 'test-refresh-secret',
                                JWT_REFRESH_EXPIRES_IN: '7d',
                            };
                            return config[key];
                        }),
                    },
                },
            ],
        }).compile();
        service = module.get(AuthService);
        usersService = module.get(UsersService);
        jwtService = module.get(JwtService);
        refreshTokenRepository = module.get(getRepositoryToken(RefreshToken));
        configService = module.get(ConfigService);
    });
    it('should be defined', () => {
        expect(service).toBeDefined();
    });
    describe('validateUser', () => {
        it('should return user data when credentials are valid', async () => {
            jest.spyOn(usersService, 'findByEmail').mockResolvedValue(mockUser);
            jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
            const result = await service.validateUser(mockUser.email, 'password123');
            expect(result).toEqual({
                id: mockUser.id,
                email: mockUser.email,
                name: mockUser.name,
                role: mockUser.role,
            });
            expect(usersService.findByEmail).toHaveBeenCalledWith(mockUser.email);
        });
        it('should return null when user is not found', async () => {
            jest.spyOn(usersService, 'findByEmail').mockResolvedValue(null);
            const result = await service.validateUser('nonexistent@test.com', 'password');
            expect(result).toBeNull();
        });
        it('should return null when password is invalid', async () => {
            jest.spyOn(usersService, 'findByEmail').mockResolvedValue(mockUser);
            jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);
            const result = await service.validateUser(mockUser.email, 'wrongpassword');
            expect(result).toBeNull();
        });
        it('should return null when user is inactive', async () => {
            const inactiveUser = userFactory.inactive();
            jest.spyOn(usersService, 'findByEmail').mockResolvedValue(inactiveUser);
            const result = await service.validateUser(inactiveUser.email, 'password123');
            expect(result).toBeNull();
        });
    });
    describe('login', () => {
        it('should return access and refresh tokens for valid user', async () => {
            const accessToken = 'access-token';
            const refreshToken = 'refresh-token';
            jest.spyOn(jwtService, 'sign')
                .mockReturnValueOnce(accessToken)
                .mockReturnValueOnce(refreshToken);
            jest.spyOn(refreshTokenRepository, 'create').mockReturnValue(mockRefreshToken);
            jest.spyOn(refreshTokenRepository, 'save').mockResolvedValue(mockRefreshToken);
            const result = await service.login(mockUser);
            expect(result).toEqual({
                access_token: accessToken,
                refresh_token: refreshToken,
                user: {
                    id: mockUser.id,
                    email: mockUser.email,
                    name: mockUser.name,
                    role: mockUser.role,
                },
            });
            expect(jwtService.sign).toHaveBeenCalledTimes(2);
            expect(refreshTokenRepository.save).toHaveBeenCalled();
        });
        it('should update last login timestamp', async () => {
            jest.spyOn(jwtService, 'sign').mockReturnValue('token');
            jest.spyOn(refreshTokenRepository, 'create').mockReturnValue(mockRefreshToken);
            jest.spyOn(refreshTokenRepository, 'save').mockResolvedValue(mockRefreshToken);
            jest.spyOn(usersService, 'update').mockResolvedValue(mockUser);
            await service.login(mockUser);
            expect(usersService.update).toHaveBeenCalledWith(mockUser.id, expect.objectContaining({
                lastLoginAt: expect.any(Date),
            }));
        });
    });
    describe('register', () => {
        const registerDto = {
            email: 'newuser@test.com',
            password: 'password123',
            name: 'New User',
            firstName: 'New',
            lastName: 'User',
        };
        it('should create new user and return tokens', async () => {
            const newUser = userFactory.create({ overrides: registerDto });
            const accessToken = 'access-token';
            const refreshToken = 'refresh-token';
            jest.spyOn(usersService, 'findByEmail').mockResolvedValue(null);
            jest.spyOn(usersService, 'create').mockResolvedValue(newUser);
            jest.spyOn(jwtService, 'sign')
                .mockReturnValueOnce(accessToken)
                .mockReturnValueOnce(refreshToken);
            jest.spyOn(refreshTokenRepository, 'create').mockReturnValue(mockRefreshToken);
            jest.spyOn(refreshTokenRepository, 'save').mockResolvedValue(mockRefreshToken);
            const result = await service.register(registerDto);
            expect(result).toEqual({
                access_token: accessToken,
                refresh_token: refreshToken,
                user: expect.objectContaining({
                    email: registerDto.email,
                    name: registerDto.name,
                }),
            });
            expect(usersService.create).toHaveBeenCalledWith(expect.objectContaining({
                email: registerDto.email,
                name: registerDto.name,
            }));
        });
        it('should throw error when email already exists', async () => {
            jest.spyOn(usersService, 'findByEmail').mockResolvedValue(mockUser);
            await expect(service.register(registerDto)).rejects.toThrow(BadRequestException);
            expect(usersService.create).not.toHaveBeenCalled();
        });
    });
    describe('refreshToken', () => {
        it('should return new access token for valid refresh token', async () => {
            const newAccessToken = 'new-access-token';
            jest.spyOn(jwtService, 'verify').mockReturnValue({ sub: mockUser.id });
            jest.spyOn(refreshTokenRepository, 'findOne').mockResolvedValue(mockRefreshToken);
            jest.spyOn(usersService, 'findById').mockResolvedValue(mockUser);
            jest.spyOn(jwtService, 'sign').mockReturnValue(newAccessToken);
            const result = await service.refreshToken('refresh-token');
            expect(result).toEqual({
                access_token: newAccessToken,
            });
            expect(jwtService.verify).toHaveBeenCalledWith('refresh-token', {
                secret: 'test-refresh-secret',
            });
        });
        it('should throw error for invalid refresh token', async () => {
            jest.spyOn(jwtService, 'verify').mockImplementation(() => {
                throw new Error('Invalid token');
            });
            await expect(service.refreshToken('invalid-token')).rejects.toThrow(UnauthorizedException);
        });
        it('should throw error for expired refresh token', async () => {
            const expiredToken = {
                ...mockRefreshToken,
                expiresAt: new Date(Date.now() - 1000),
            };
            jest.spyOn(jwtService, 'verify').mockReturnValue({ sub: mockUser.id });
            jest.spyOn(refreshTokenRepository, 'findOne').mockResolvedValue(expiredToken);
            await expect(service.refreshToken('expired-token')).rejects.toThrow(UnauthorizedException);
        });
    });
    describe('logout', () => {
        it('should delete refresh token', async () => {
            jest.spyOn(refreshTokenRepository, 'delete').mockResolvedValue({ affected: 1 });
            await service.logout('refresh-token');
            expect(refreshTokenRepository.delete).toHaveBeenCalledWith({
                token: 'refresh-token',
            });
        });
    });
    describe('forgotPassword', () => {
        it('should generate reset token for existing user', async () => {
            jest.spyOn(usersService, 'findByEmail').mockResolvedValue(mockUser);
            jest.spyOn(usersService, 'update').mockResolvedValue(mockUser);
            await service.forgotPassword(mockUser.email);
            expect(usersService.update).toHaveBeenCalledWith(mockUser.id, expect.objectContaining({
                passwordResetToken: expect.any(String),
                passwordResetExpires: expect.any(Date),
            }));
        });
        it('should not throw error for non-existent email', async () => {
            jest.spyOn(usersService, 'findByEmail').mockResolvedValue(null);
            await expect(service.forgotPassword('nonexistent@test.com')).resolves.not.toThrow();
        });
    });
    describe('resetPassword', () => {
        it('should reset password with valid token', async () => {
            const userWithResetToken = userFactory.withTrait('withResetToken');
            jest.spyOn(usersService, 'findByEmail').mockResolvedValue(userWithResetToken);
            jest.spyOn(usersService, 'update').mockResolvedValue(userWithResetToken);
            await service.resetPassword('reset-token', 'newpassword123');
            expect(usersService.update).toHaveBeenCalledWith(userWithResetToken.id, expect.objectContaining({
                password: expect.any(String),
                passwordResetToken: null,
                passwordResetExpires: null,
            }));
        });
        it('should throw error for invalid reset token', async () => {
            jest.spyOn(usersService, 'findByEmail').mockResolvedValue(null);
            await expect(service.resetPassword('invalid-token', 'newpassword')).rejects.toThrow(BadRequestException);
        });
    });
});
