import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import { EmailLog } from './entities/email-log.entity';
import { EmailPreference } from './entities/email-preference.entity';
import { EmailTemplate } from './entities/email-template.entity';

describe('EmailService (tracking)', () => {
  let service: EmailService;
  let emailLogRepo: jest.Mocked<Repository<EmailLog>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: ConfigService, useValue: { get: jest.fn(() => undefined) } },
        { provide: getRepositoryToken(EmailTemplate), useValue: {} },
        { provide: getRepositoryToken(EmailPreference), useValue: {} },
        {
          provide: getRepositoryToken(EmailLog),
          useValue: {
            findOne: jest.fn(),
            update: jest.fn(),
          },
        },
        { provide: 'BullQueue_email', useValue: { add: jest.fn() } },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    emailLogRepo = module.get(getRepositoryToken(EmailLog));
  });

  describe('markEmailAsOpened', () => {
    it('increments openCount and sets timestamps', async () => {
      const existing: Partial<EmailLog> = {
        id: '1',
        trackingToken: 'tok',
        openCount: 0,
        firstOpenedAt: null,
      } as any;
      emailLogRepo.findOne.mockResolvedValue(existing as EmailLog);
      emailLogRepo.update.mockResolvedValue({} as any);

      await service.markEmailAsOpened('tok', { userAgent: 'ua', ipAddress: '127.0.0.1' });

      expect(emailLogRepo.update).toHaveBeenCalledWith(
        { id: '1' },
        expect.objectContaining({ openCount: 1, openedAt: expect.any(Date), firstOpenedAt: expect.any(Date) }),
      );
    });

    it('throws for invalid token', async () => {
      emailLogRepo.findOne.mockResolvedValue(null);
      await expect(service.markEmailAsOpened('bad')).rejects.toBeTruthy();
    });
  });

  describe('markEmailAsClicked', () => {
    it('increments clickCount and appends event', async () => {
      const existing: Partial<EmailLog> = {
        id: '1',
        trackingToken: 'tok',
        clickCount: 0,
        clickEvents: [],
      } as any;
      emailLogRepo.findOne.mockResolvedValue(existing as EmailLog);
      emailLogRepo.update.mockResolvedValue({} as any);

      await service.markEmailAsClicked('tok', 'https://example.com', { userAgent: 'ua', ipAddress: '127.0.0.1' });

      expect(emailLogRepo.update).toHaveBeenCalledWith(
        { id: '1' },
        expect.objectContaining({ clickCount: 1, clickEvents: expect.any(Array) }),
      );
    });

    it('throws for invalid token', async () => {
      emailLogRepo.findOne.mockResolvedValue(null);
      await expect(service.markEmailAsClicked('bad', 'https://x.com')).rejects.toBeTruthy();
    });
  });

  describe('getEmailLogAnalytics', () => {
    it('returns safe analytics shape', async () => {
      const log: Partial<EmailLog> = {
        id: '1',
        recipient: 'u@example.com',
        subject: 'Sub',
        createdAt: new Date(),
        firstOpenedAt: null,
        openCount: 0,
        firstClickedAt: new Date(),
        clickCount: 2,
        clickEvents: [{ clickedAt: new Date().toISOString(), url: 'https://x.com' }],
      } as any;
      emailLogRepo.findOne.mockResolvedValue(log as EmailLog);
      const result = await service.getEmailLogAnalytics('1');
      expect(result).toMatchObject({ id: '1', clicked: true, clickCount: 2 });
      expect(result).not.toHaveProperty('trackingToken');
    });
  });
});

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

  describe('getEmailAnalyticsByRange', () => {
    it('should return aggregated analytics for a date range', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { templateName: 'email-verification', count: 10, status: 'sent' },
        ]),
      };
      mockEmailLogRepo.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');
      const result = await service.getEmailAnalyticsByRange(startDate, endDate);

      expect(mockEmailLogRepo.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('log.templateName', 'templateName');
      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith('COUNT(*)', 'count');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('log.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate });
      expect(mockQueryBuilder.groupBy).toHaveBeenCalledWith('log.templateName');
      expect(mockQueryBuilder.addGroupBy).toHaveBeenCalledWith('log.status');
      expect(result).toEqual([{ templateName: 'email-verification', count: 10, status: 'sent' }]);
    });

    it('should filter by template name if provided', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      mockEmailLogRepo.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');
      await service.getEmailAnalyticsByRange(startDate, endDate, 'email-verification');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('log.templateName = :templateName', { templateName: 'email-verification' });
    });
  });
});
