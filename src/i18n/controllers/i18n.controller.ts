import { Controller, Get, Query, Headers } from '@nestjs/common';
import { I18nService, SUPPORTED_LANGUAGES } from '../services/i18n.service';

@Controller('i18n')
export class I18nController {
  constructor(private readonly i18nService: I18nService) {}

  /**
   * Get all supported languages
   */
  @Get('languages')
  getSupportedLanguages() {
    return {
      languages: SUPPORTED_LANGUAGES,
      total: Object.keys(SUPPORTED_LANGUAGES).length,
    };
  }

  /**
   * Get translations for a specific language
   */
  @Get('translations')
  getTranslations(@Query('lang') language: string = 'en', @Query('keys') keys?: string) {
    if (keys) {
      const keyArray = keys.split(',');
      return this.i18nService.translateMultiple(keyArray, language);
    }

    // Return all available translations for the language
    return {
      language: this.i18nService.normalizeLanguageCode(language),
      metadata: this.i18nService.getLanguageMetadata(language),
    };
  }

  /**
   * Detect language from headers
   */
  @Get('detect')
  detectLanguage(@Headers('accept-language') acceptLanguageHeader: string) {
    const detected = this.i18nService.detectLanguageFromHeader(acceptLanguageHeader);
    const metadata = this.i18nService.getLanguageMetadata(detected);

    return {
      detected,
      metadata,
      rtl: this.i18nService.isRTL(detected),
    };
  }

  /**
   * Translate a single key
   */
  @Get('translate')
  translate(@Query('key') key: string, @Query('lang') language: string = 'en') {
    if (!key) {
      return { error: 'Translation key is required' };
    }

    return {
      key,
      language: this.i18nService.normalizeLanguageCode(language),
      translation: this.i18nService.translate(key, language),
    };
  }
}
