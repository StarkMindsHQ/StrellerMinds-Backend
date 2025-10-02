import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { jest } from '@jest/globals';

import { LocaleService } from '../services/locale.service';
import { UserLocale, LocaleSource } from '../entities/user-locale.entity';
import { LocaleMetadata, LocaleStatus } from '../entities/locale-metadata.entity';

describe('LocaleService', () => {
  let service: LocaleService;
  let userLocaleRepository: jest.Mocked<Repository<UserLocale>>;
  let localeMetadataRepository: jest.Mocked<Repository<LocaleMetadata>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocaleService,
        {
          provide: getRepositoryToken(UserLocale),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(LocaleMetadata),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<LocaleService>(LocaleService);
    userLocaleRepository = module.get(getRepositoryToken(UserLocale));
    localeMetadataRepository = module.get(getRepositoryToken(LocaleMetadata));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUserLocale', () => {
    it('should return user locale if exists', async () => {
      const mockUserLocale = {
        id: '1',
        userId: 'user1',
        locale: 'fr',
        isActive: true,
      } as UserLocale;

      userLocaleRepository.findOne.mockResolvedValue(mockUserLocale);

      const result = await service.getUserLocale('user1');

      expect(result).toBe('fr');
      expect(userLocaleRepository.update).toHaveBeenCalledWith('1', {
        lastUsedAt: expect.any(Date),
      });
    });

    it('should return default locale if user locale not found', async () => {
      userLocaleRepository.findOne.mockResolvedValue(null);

      const result = await service.getUserLocale('user1');

      expect(result).toBe('en');
    });
  });

  describe('setUserLocale', () => {
    it('should create new user locale', async () => {
      const mockLocaleMetadata = {
        code: 'fr',
        status: LocaleStatus.ACTIVE,
        fallbackLocales: ['en'],
      } as LocaleMetadata;

      userLocaleRepository.findOne.mockResolvedValue(null);
      localeMetadataRepository.findOne.mockResolvedValue(mockLocaleMetadata);
      userLocaleRepository.create.mockReturnValue({} as any);
      userLocaleRepository.save.mockResolvedValue({
        id: '1',
        userId: 'user1',
        locale: 'fr',
      } as any);

      const result = await service.setUserLocale('user1', 'fr');

      expect(result.locale).toBe('fr');
      expect(userLocaleRepository.create).toHaveBeenCalledWith({
        userId: 'user1',
        locale: 'fr',
        source: LocaleSource.USER_PREFERENCE,
        fallbackLocales: ['en'],
        lastUsedAt: expect.any(Date),
      });
    });

    it('should throw error for unsupported locale', async () => {
      localeMetadataRepository.findOne.mockResolvedValue(null);

      await expect(service.setUserLocale('user1', 'invalid')).rejects.toThrow(
        'Locale invalid is not supported or active',
      );
    });
  });

  describe('detectLocaleFromGeoLocation', () => {
    it('should return locale for known country', async () => {
      const mockLocaleMetadata = {
        code: 'fr-FR',
        status: LocaleStatus.ACTIVE,
      } as LocaleMetadata;

      localeMetadataRepository.findOne.mockResolvedValue(mockLocaleMetadata);

      const result = await service.detectLocaleFromGeoLocation('FR');

      expect(result).toBe('fr-FR');
    });

    it('should return default locale for unknown country', async () => {
      const result = await service.detectLocaleFromGeoLocation('XX');

      expect(result).toBe('en');
    });
  });
});
