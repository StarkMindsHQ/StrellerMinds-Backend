import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EmailTemplate } from './entities/email-template.entity';
import { EmailLog } from './entities/email-log.entity';
import { EmailPreference } from './entities/email-preference.entity';
import { Queue } from 'bull';
import { JwtService } from '@nestjs/jwt';

describe('EmailService.verifyUnsubscribeToken', () => {
  let service: EmailService;
  let config: Partial<ConfigService>;
  let jwt: { sign: jest.Mock; verify: jest.Mock };

  beforeEach(async () => {
    config = {
      get: jest.fn((key: string) => {
        if (key === 'UNSUBSCRIBE_JWT_SECRET') return 'secret-x';
        if (key === 'JWT_SECRET') return 'fallback';
        return undefined;
      }),
    } as any;

    jwt = { sign: jest.fn(), verify: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: ConfigService, useValue: config },
        { provide: 'BullQueue_email', useValue: { add: jest.fn() } as Partial<Queue> },
        { provide: getRepositoryToken(EmailTemplate), useValue: {} },
        { provide: getRepositoryToken(EmailLog), useValue: {} },
        { provide: getRepositoryToken(EmailPreference), useValue: {} },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();

    service = module.get(EmailService);
  });

  it('returns true when token payload email matches', async () => {
    jwt.verify.mockReturnValue({ email: 'user@example.com' });
    const ok = await service.verifyUnsubscribeToken('user@example.com', 'tok');
    expect(ok).toBe(true);
  });

  it('returns false on invalid token', async () => {
    jwt.verify.mockImplementation(() => { throw new Error('bad'); });
    const ok = await service.verifyUnsubscribeToken('user@example.com', 'tok');
    expect(ok).toBe(false);
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EmailTemplate } from './entities/email-template.entity';
import { EmailLog } from './entities/email-log.entity';
import { EmailPreference } from './entities/email-preference.entity';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bull';

describe('EmailService', () => {
  let service: EmailService;
  let mockQueue: Queue;

  const mockEmailTemplateRepo = {
    findOne: jest.fn(),
  };
  const mockEmailLogRepo = {
    create: jest.fn().mockImplementation((data) => data),
    save: jest.fn(),
    update: jest.fn(),
    findOne: jest.fn(),
  };
  const mockEmailPreferenceRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    mockQueue = {
      add: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: ConfigService, useValue: { get: jest.fn(() => 'mock') } },
        { provide: getRepositoryToken(EmailTemplate), useValue: mockEmailTemplateRepo },
        { provide: getRepositoryToken(EmailLog), useValue: mockEmailLogRepo },
        { provide: getRepositoryToken(EmailPreference), useValue: mockEmailPreferenceRepo },
        { provide: 'BullQueue_email', useValue: mockQueue },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendEmail', () => {
    it('should queue the email if user has not opted out', async () => {
      mockEmailPreferenceRepo.findOne.mockResolvedValue(null);
      const result = await service.sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        templateName: 'email-verification',
        context: {},
      });
      expect(result).toBe(true);
      expect(mockQueue.add).toHaveBeenCalled();
    });

    it('should not send email if user has opted out', async () => {
      mockEmailPreferenceRepo.findOne.mockResolvedValue({ optOut: true });
      const result = await service.sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        templateName: 'email-verification',
        context: {},
      });
      expect(result).toBe(false);
      expect(mockQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('updateEmailPreference', () => {
    it('should create a new preference if none exists', async () => {
      mockEmailPreferenceRepo.findOne.mockResolvedValue(null);
      await service.updateEmailPreference('user@example.com', 'email-verification', true);
      expect(mockEmailPreferenceRepo.create).toHaveBeenCalled();
      expect(mockEmailPreferenceRepo.save).toHaveBeenCalled();
    });

    it('should update existing preference', async () => {
      mockEmailPreferenceRepo.findOne.mockResolvedValue({ email: 'user@example.com', optOut: false });
      await service.updateEmailPreference('user@example.com', 'email-verification', true);
      expect(mockEmailPreferenceRepo.save).toHaveBeenCalled();
    });
  });

  describe('getTemplate', () => {
    it('should fetch template from database if exists', async () => {
      mockEmailTemplateRepo.findOne.mockResolvedValue({ content: '<p>Hello</p>' });
      const template = await service.getTemplate('email-verification');
      expect(template).toBe('<p>Hello</p>');
    });
  });
});
