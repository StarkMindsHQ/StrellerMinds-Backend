import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EmailVerificationService } from './email-verification.service';
import { User } from '../entities/user.entity';
import { EmailService } from '../email/email.service';

describe('EmailVerificationService', () => {
  let service: EmailVerificationService;
  let userRepository: Repository<User>;
  let emailService: EmailService;

  const mockUser = {
    id: '123',
    email: 'test@example.com',
    isEmailVerified: false,
    emailVerificationToken: null,
    emailVerificationTokenExpiry: null,
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockEmailService = {
    sendVerificationEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailVerificationService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = module.get<EmailVerificationService>(EmailVerificationService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    emailService = module.get<EmailService>(EmailService);
  });

  describe('sendVerificationEmail', () => {
    it('should send verification email for valid user', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.update.mockResolvedValue({});
      mockEmailService.sendVerificationEmail.mockResolvedValue(undefined);

      const result = await service.sendVerificationEmail('test@example.com');

      expect(result.message).toBe('Verification email sent successfully');
      expect(mockEmailService.sendVerificationEmail).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent user', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.sendVerificationEmail('test@example.com'))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for already verified email', async () => {
      mockUserRepository.findOne.mockResolvedValue({
        ...mockUser,
        isEmailVerified: true,
      });

      await expect(service.sendVerificationEmail('test@example.com'))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('verifyEmail', () => {
    it('should verify email with valid token', async () => {
      const mockUserWithToken = {
        ...mockUser,
        emailVerificationToken: 'valid-token',
        emailVerificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      mockUserRepository.findOne.mockResolvedValue(mockUserWithToken);
      mockUserRepository.update.mockResolvedValue({});

      const result = await service.verifyEmail('valid-token');

      expect(result.message).toBe('Email verified successfully');
      expect(result.user.isEmailVerified).toBe(true);
    });

    it('should throw BadRequestException for invalid token', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.verifyEmail('invalid-token'))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for expired token', async () => {
      const mockUserWithExpiredToken = {
        ...mockUser,
        emailVerificationToken: 'expired-token',
        emailVerificationTokenExpiry: new Date(Date.now() - 1000),
      };

      mockUserRepository.findOne.mockResolvedValue(mockUserWithExpiredToken);

      await expect(service.verifyEmail('expired-token'))
        .rejects.toThrow(BadRequestException);
    });
  });
});
