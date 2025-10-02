import { Injectable, Logger } from '@nestjs/common';
import type { I18nService as NestI18nService } from 'nestjs-i18n';
import type { Repository } from 'typeorm';

import type { Translation } from '../entities/translation.entity';
import type { LocaleMetadata } from '../entities/locale-metadata.entity';
import type { TranslationService } from './translation.service';
import type { LocaleService } from './locale.service';

export interface TranslationOptions {
  locale?: string;
  fallback?: string;
  args?: Record<string, any>;
  defaultValue?: string;
  namespace?: string;
}

export interface LocalizedResponse<T = any> {
  data: T;
  locale: string;
  fallbackUsed?: boolean;
  translations?: Record<string, string>;
}

@Injectable()
export class I18nService {
  private readonly logger = new Logger(I18nService.name);

  constructor(
    private readonly nestI18nService: NestI18nService,
    private readonly translationRepository: Repository<Translation>,
    private readonly translationService: TranslationService,
    private readonly localeService: LocaleService,
  ) {}

  async translate(key: string, options: TranslationOptions = {}): Promise<string> {
    const { locale = 'en', fallback = 'en', args, defaultValue, namespace = 'common' } = options;

    try {
      // Try to get translation from database first
      const dbTranslation = await this.getTranslationFromDb(key, locale, namespace);
      if (dbTranslation) {
        return this.interpolateTranslation(dbTranslation.value, args);
      }

      // Fallback to file-based translations
      const fileTranslation = await this.nestI18nService.translate(`${namespace}.${key}`, {
        lang: locale,
        args,
        defaultValue,
      });

      if (fileTranslation && fileTranslation !== key) {
        return fileTranslation;
      }

      // Try fallback locale
      if (locale !== fallback) {
        return this.translate(key, { ...options, locale: fallback });
      }

      // Return default value or key
      return defaultValue || key;
    } catch (error) {
      this.logger.error(`Translation error for key ${key}:`, error);
      return defaultValue || key;
    }
  }

  async translateMultiple(
    keys: string[],
    options: TranslationOptions = {},
  ): Promise<Record<string, string>> {
    const translations: Record<string, string> = {};

    await Promise.all(
      keys.map(async (key) => {
        translations[key] = await this.translate(key, options);
      }),
    );

    return translations;
  }

  async localizeResponse<T>(
    data: T,
    locale: string,
    translationKeys?: string[],
  ): Promise<LocalizedResponse<T>> {
    const response: LocalizedResponse<T> = {
      data,
      locale,
    };

    if (translationKeys && translationKeys.length > 0) {
      response.translations = await this.translateMultiple(translationKeys, { locale });
    }

    return response;
  }

  async getUserLocale(userId: string): Promise<string> {
    return this.localeService.getUserLocale(userId);
  }

  async setUserLocale(userId: string, locale: string): Promise<void> {
    await this.localeService.setUserLocale(userId, locale);
  }

  async getSupportedLocales(): Promise<LocaleMetadata[]> {
    return this.localeService.getSupportedLocales();
  }

  async detectLocaleFromRequest(request: any): Promise<string> {
    // Check query parameter
    if (request.query?.lang) {
      return request.query.lang;
    }

    // Check custom header
    if (request.headers?.['x-custom-lang']) {
      return request.headers['x-custom-lang'];
    }

    // Check Accept-Language header
    if (request.headers?.['accept-language']) {
      const acceptedLanguages = request.headers['accept-language']
        .split(',')
        .map((lang: string) => lang.split(';')[0].trim());

      const supportedLocales = await this.getSupportedLocales();
      const supportedCodes = supportedLocales.map((locale) => locale.code);

      for (const lang of acceptedLanguages) {
        if (supportedCodes.includes(lang)) {
          return lang;
        }

        // Try language code without country
        const langCode = lang.split('-')[0];
        const matchingLocale = supportedCodes.find((code) => code.startsWith(langCode));
        if (matchingLocale) {
          return matchingLocale;
        }
      }
    }

    return 'en'; // Default fallback
  }

  private async getTranslationFromDb(
    key: string,
    locale: string,
    namespace: string,
  ): Promise<Translation | null> {
    return this.translationRepository.findOne({
      where: {
        key,
        locale,
        namespace,
        status: 'published',
      },
    });
  }

  private interpolateTranslation(template: string, args?: Record<string, any>): string {
    if (!args) return template;

    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return args[key] !== undefined ? String(args[key]) : match;
    });
  }

  async getNamespaceTranslations(
    namespace: string,
    locale: string,
  ): Promise<Record<string, string>> {
    const translations = await this.translationRepository.find({
      where: {
        namespace,
        locale,
        status: 'published',
      },
    });

    const result: Record<string, string> = {};
    for (const translation of translations) {
      result[translation.key] = translation.value;
    }

    return result;
  }

  async invalidateCache(locale?: string, namespace?: string): Promise<void> {
    // Implementation for cache invalidation
    this.logger.log(`Cache invalidated for locale: ${locale}, namespace: ${namespace}`);
  }
}
