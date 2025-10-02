import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { I18nService as NestI18nService } from 'nestjs-i18n';
import type { Repository } from 'typeorm';
import { jest } from '@jest/globals';

import { I18nService } from '../services/i18n.service';
import { TranslationService } from '../services/translation.service';
import { LocaleService } from '../services/locale.service';
import { Translation } from '../entities/translation.entity';

describe('I18nService', () => {
  let service: I18nService;
  let translationRepository: jest.Mocked<Repository<Translation>>;
  let nestI18nService: jest.Mocked<NestI18nService>;
  let translationService: jest.Mocked<TranslationService>;
  let localeService: jest.Mocked<LocaleService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        I18nService,
        {
          provide: getRepositoryToken(Translation),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: NestI18nService,
          useValue: {
            translate: jest.fn(),
          },
        },
        {
          provide: TranslationService,
          useValue: {
            getTranslations: jest.fn(),
          },
        },
        {
          provide: LocaleService,
          useValue: {
            getUserLocale: jest.fn(),
            setUserLocale: jest.fn(),
            getSupportedLocales: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<I18nService>(I18nService);
    translationRepository = module.get(getRepositoryToken(Translation));
    nestI18nService = module.get(NestI18nService);
    translationService = module.get(TranslationService);
    localeService = module.get(LocaleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('translate', () => {
    it('should return translation from database', async () => {
      const mockTranslation = {
        id: '1',
        key: 'hello',
        locale: 'en',
        namespace: 'common',
        value: 'Hello World',
        status: 'published',
      } as Translation;

      translationRepository.findOne.mockResolvedValue(mockTranslation);

      const result = await service.translate('hello', { locale: 'en' });

      expect(result).toBe('Hello World');
      expect(translationRepository.findOne).toHaveBeenCalledWith({
        where: {
          key: 'hello',
          locale: 'en',
          namespace: 'common',
          status: 'published',
        },
      });
    });

    it('should fallback to file-based translation', async () => {
      translationRepository.findOne.mockResolvedValue(null);
      nestI18nService.translate.mockResolvedValue('Hello from file');

      const result = await service.translate('hello', { locale: 'en' });

      expect(result).toBe('Hello from file');
      expect(nestI18nService.translate).toHaveBeenCalledWith('common.hello', {
        lang: 'en',
        args: undefined,
        defaultValue: undefined,
      });
    });

    it('should interpolate variables in translation', async () => {
      const mockTranslation = {
        id: '1',
        key: 'welcome',
        locale: 'en',
        namespace: 'common',
        value: 'Welcome {{name}}!',
        status: 'published',
      } as Translation;

      translationRepository.findOne.mockResolvedValue(mockTranslation);

      const result = await service.translate('welcome', {
        locale: 'en',
        args: { name: 'John' },
      });

      expect(result).toBe('Welcome John!');
    });

    it('should return default value when translation not found', async () => {
      translationRepository.findOne.mockResolvedValue(null);
      nestI18nService.translate.mockResolvedValue('welcome');

      const result = await service.translate('welcome', {
        locale: 'en',
        defaultValue: 'Default Welcome',
      });

      expect(result).toBe('Default Welcome');
    });
  });

  describe('translateMultiple', () => {
    it('should translate multiple keys', async () => {
      const mockTranslations = [
        {
          id: '1',
          key: 'hello',
          locale: 'en',
          namespace: 'common',
          value: 'Hello',
          status: 'published',
        },
        {
          id: '2',
          key: 'goodbye',
          locale: 'en',
          namespace: 'common',
          value: 'Goodbye',
          status: 'published',
        },
      ] as Translation[];

      translationRepository.findOne
        .mockResolvedValueOnce(mockTranslations[0])
        .mockResolvedValueOnce(mockTranslations[1]);

      const result = await service.translateMultiple(['hello', 'goodbye'], { locale: 'en' });

      expect(result).toEqual({
        hello: 'Hello',
        goodbye: 'Goodbye',
      });
    });
  });

  describe('detectLocaleFromRequest', () => {
    it('should detect locale from query parameter', async () => {
      const request = {
        query: { lang: 'fr' },
        headers: {},
      };

      const result = await service.detectLocaleFromRequest(request);

      expect(result).toBe('fr');
    });

    it('should detect locale from custom header', async () => {
      const request = {
        query: {},
        headers: { 'x-custom-lang': 'de' },
      };

      const result = await service.detectLocaleFromRequest(request);

      expect(result).toBe('de');
    });

    it('should detect locale from Accept-Language header', async () => {
      const request = {
        query: {},
        headers: { 'accept-language': 'es-ES,es;q=0.9,en;q=0.8' },
      };

      localeService.getSupportedLocales.mockResolvedValue([
        { code: 'es-ES', status: 'active' } as any,
        { code: 'en', status: 'active' } as any,
      ]);

      const result = await service.detectLocaleFromRequest(request);

      expect(result).toBe('es-ES');
    });

    it('should fallback to default locale', async () => {
      const request = {
        query: {},
        headers: {},
      };

      localeService.getSupportedLocales.mockResolvedValue([]);

      const result = await service.detectLocaleFromRequest(request);

      expect(result).toBe('en');
    });
  });
});
