import { Injectable } from '@nestjs/common';
import { join } from 'path';
import * as fs from 'fs';

/**
 * Supported languages in the system
 * Extended to support 15+ languages for global accessibility
 */
export const SUPPORTED_LANGUAGES = {
  en: { name: 'English', rtl: false, region: 'US' },
  es: { name: 'Español', rtl: false, region: 'ES' },
  fr: { name: 'Français', rtl: false, region: 'FR' },
  de: { name: 'Deutsch', rtl: false, region: 'DE' },
  it: { name: 'Italiano', rtl: false, region: 'IT' },
  pt: { name: 'Português', rtl: false, region: 'PT' },
  ru: { name: 'Русский', rtl: false, region: 'RU' },
  ja: { name: '日本語', rtl: false, region: 'JP' },
  zh: { name: '中文', rtl: false, region: 'CN' },
  ko: { name: '한국어', rtl: false, region: 'KR' },
  ar: { name: 'العربية', rtl: true, region: 'SA' },
  hi: { name: 'हिन्दी', rtl: false, region: 'IN' },
  th: { name: 'ไทย', rtl: false, region: 'TH' },
  vi: { name: 'Tiếng Việt', rtl: false, region: 'VN' },
  tr: { name: 'Türkçe', rtl: false, region: 'TR' },
};

@Injectable()
export class I18nService {
  private translations: Map<string, any> = new Map();
  private defaultLanguage = 'en';

  constructor() {
    this.loadTranslations();
  }

  /**
   * Load all translation files
   */
  private loadTranslations(): void {
    const translationsPath = join(__dirname, '../translations');

    if (!fs.existsSync(translationsPath)) {
      console.warn(`Translations directory not found at ${translationsPath}`);
      return;
    }

    for (const lang of Object.keys(SUPPORTED_LANGUAGES)) {
      const filePath = join(translationsPath, `${lang}.json`);
      try {
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          this.translations.set(lang, JSON.parse(content));
        }
      } catch (error) {
        console.error(`Failed to load translation for language ${lang}:`, error);
      }
    }
  }

  /**
   * Get translated text for a given key and language
   * @param key Translation key (dot notation supported: "common.welcome")
   * @param language Language code
   * @param params Optional parameters for interpolation
   */
  translate(
    key: string,
    language: string = this.defaultLanguage,
    params?: Record<string, any>,
  ): string {
    // Normalize language code
    const normalizedLang = this.normalizeLanguageCode(language);

    // Fallback to default language if translation not found
    let translations = this.translations.get(normalizedLang);
    if (!translations) {
      translations = this.translations.get(this.defaultLanguage);
    }

    // Navigate through nested keys
    let value = translations;
    for (const part of key.split('.')) {
      value = value?.[part];
    }

    if (!value) {
      console.warn(`Translation key not found: ${key} for language ${normalizedLang}`);
      return key;
    }

    // Interpolate parameters if provided
    if (params) {
      return this.interpolate(value, params);
    }

    return value;
  }

  /**
   * Get multiple translations at once
   */
  translateMultiple(
    keys: string[],
    language: string = this.defaultLanguage,
  ): Record<string, string> {
    const result: Record<string, string> = {};
    for (const key of keys) {
      result[key] = this.translate(key, language);
    }
    return result;
  }

  /**
   * Interpolate parameters into translation string
   */
  private interpolate(text: string, params: Record<string, any>): string {
    let result = text;
    for (const [key, value] of Object.entries(params)) {
      result = result.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), String(value));
    }
    return result;
  }

  /**
   * Normalize language code (e.g., en-US -> en)
   */
  normalizeLanguageCode(language: string): string {
    const base = language.split('-')[0].toLowerCase();
    return Object.keys(SUPPORTED_LANGUAGES).includes(base) ? base : this.defaultLanguage;
  }

  /**
   * Get all supported languages
   */
  getSupportedLanguages(): typeof SUPPORTED_LANGUAGES {
    return SUPPORTED_LANGUAGES;
  }

  /**
   * Check if language is RTL
   */
  isRTL(language: string): boolean {
    const normalized = this.normalizeLanguageCode(language);
    return SUPPORTED_LANGUAGES[normalized]?.rtl ?? false;
  }

  /**
   * Get language metadata
   */
  getLanguageMetadata(language: string) {
    const normalized = this.normalizeLanguageCode(language);
    return {
      code: normalized,
      ...SUPPORTED_LANGUAGES[normalized],
    };
  }

  /**
   * Set default language
   */
  setDefaultLanguage(language: string): void {
    const normalized = this.normalizeLanguageCode(language);
    if (Object.keys(SUPPORTED_LANGUAGES).includes(normalized)) {
      this.defaultLanguage = normalized;
    }
  }

  /**
   * Detect language from Accept-Language header
   */
  detectLanguageFromHeader(acceptLanguageHeader: string): string {
    if (!acceptLanguageHeader) {
      return this.defaultLanguage;
    }

    // Parse Accept-Language header (e.g., "en-US,en;q=0.9,fr;q=0.8")
    const languages = acceptLanguageHeader
      .split(',')
      .map((lang) => {
        const [code, q] = lang.split(';');
        return {
          code: code.trim(),
          quality: q ? parseFloat(q.split('=')[1]) : 1,
        };
      })
      .sort((a, b) => b.quality - a.quality);

    for (const { code } of languages) {
      const normalized = this.normalizeLanguageCode(code);
      if (Object.keys(SUPPORTED_LANGUAGES).includes(normalized)) {
        return normalized;
      }
    }

    return this.defaultLanguage;
  }
}
