import { Module } from '@nestjs/common';
import { I18nModule as NestI18nModule } from 'nestjs-i18n';
import * as path from 'path';

@Module({
  imports: [
    NestI18nModule.forRoot({
      fallbackLanguage: 'en',
      fallbacks: {
        'en-*': 'en',
        'es-*': 'es',
        'ar-*': 'ar',
      },
      loaderOptions: {
        path: path.join(__dirname, 'i18n'),
        watch: true,
        include: ['en', 'es', 'ar', 'error_messages'],
      },
    }),
  ],
  exports: [NestI18nModule],
})
export class I18nModule {}
