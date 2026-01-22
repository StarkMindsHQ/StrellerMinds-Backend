import { Module } from '@nestjs/common';
import { I18nService } from './services/i18n.service';
import { I18nController } from './controllers/i18n.controller';
import { LanguageDetectionMiddleware } from './middleware/language-detection.middleware';

@Module({
  providers: [I18nService],
  controllers: [I18nController],
  exports: [I18nService],
})
export class I18nModule {
  static register() {
    return {
      module: I18nModule,
      providers: [I18nService],
      controllers: [I18nController],
      exports: [I18nService],
    };
  }
}
