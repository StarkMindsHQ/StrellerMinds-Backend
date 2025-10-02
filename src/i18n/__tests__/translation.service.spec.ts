import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { jest } from '@jest/globals';

import { TranslationService } from '../services/translation.service';
import { TmsService } from '../services/tms.service';
import { Translation, TranslationStatus } from '../entities/translation.entity';

describe('TranslationService', () => {
  let service: TranslationService;
  let repository: jest.Mocked<Repository<Translation>>;
  let tmsService: jest.Mocked<TmsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TranslationService,
        {
          provide: getRepositoryToken(Translation),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
            delete: jest.fn(),
            update: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: TmsService,
          useValue: {
            getTranslations: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TranslationService>(TranslationService);
    repository = module.get(getRepositoryToken(Translation));
    tmsService = module.get(TmsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createTranslation', () => {
    it('should create a new translation', async () => {
      const dto = {
        key: 'hello',
        locale: 'en',
        namespace: 'common',
        value: 'Hello World',
      };

      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(dto as any);
      repository.save.mockResolvedValue({ id: '1', ...dto } as any);

      const result = await service.createTranslation(dto);

      expect(result).toEqual({ id: '1', ...dto });
      expect(repository.create).toHaveBeenCalledWith({
        ...dto,
        status: TranslationStatus.DRAFT,
        source: 'manual',
        version: 1,
      });
    });

    it('should throw error if translation already exists', async () => {
      const dto = {
        key: 'hello',
        locale: 'en',
        namespace: 'common',
        value: 'Hello World',
      };

      repository.findOne.mockResolvedValue({ id: '1' } as any);

      await expect(service.createTranslation(dto)).rejects.toThrow(
        'Translation already exists for key: hello, locale: en',
      );
    });
  });

  describe('updateTranslation', () => {
    it('should update translation and increment version', async () => {
      const existingTranslation = {
        id: '1',
        key: 'hello',
        locale: 'en',
        namespace: 'common',
        value: 'Hello',
        version: 1,
      } as Translation;

      const updateDto = {
        value: 'Hello World',
        status: TranslationStatus.APPROVED,
      };

      repository.findOne.mockResolvedValue(existingTranslation);
      repository.save.mockResolvedValue({
        ...existingTranslation,
        ...updateDto,
        version: 2,
        translatedAt: expect.any(Date),
      } as any);

      const result = await service.updateTranslation('1', updateDto);

      expect(result.version).toBe(2);
      expect(result.value).toBe('Hello World');
      expect(repository.save).toHaveBeenCalled();
    });
  });

  describe('getTranslationStats', () => {
    it('should return translation statistics', async () => {
      const mockTranslations = [
        { status: TranslationStatus.PUBLISHED, namespace: 'common' },
        { status: TranslationStatus.DRAFT, namespace: 'common' },
        { status: TranslationStatus.PUBLISHED, namespace: 'auth' },
      ] as Translation[];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockTranslations),
      };

      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getTranslationStats('en');

      expect(result).toEqual({
        total: 3,
        byStatus: {
          draft: 1,
          pending_review: 0,
          approved: 0,
          published: 2,
          deprecated: 0,
        },
        byNamespace: {
          common: 2,
          auth: 1,
        },
        completionPercentage: 67,
      });
    });
  });
});
