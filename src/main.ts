import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { RolesGuard } from './role/roles.guard';
import { GlobalExceptionsFilter } from './common/filters/global-exception.filter';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe, HttpStatus } from '@nestjs/common';
import { I18nService } from './i18n/i18n.service';
import { CustomException } from './common/errors/custom.exception';
import { ErrorCode } from './common/errors/error-codes.enum';
import { I18nTranslations } from './i18n/i18n.types';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Get the I18nService instance from the app module
  const i18nService = app.get<I18nService>(I18nService);

  // Apply the global exception filter with the correct I18nService instance
  app.useGlobalFilters(new GlobalExceptionsFilter(i18nService));

  // ✅ Global Validation Pipe with i18n error support
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) => {
        const i18n = app.get<I18nService>(I18nService);
        const lang = 'en'; // Or get from request header
        const details = errors.map((error) => ({
          field: error.property,
          message: Object.values(error.constraints || {}).join(', '),
        }));
        return new CustomException(
          ErrorCode.INVALID_INPUT,
          i18n,
          lang,
          'error_messages.validation.invalidFormat',
          HttpStatus.BAD_REQUEST,
          details,
        );
      },
    }),
  );

  // ✅ Global exception and role guards
  app.useGlobalGuards(new RolesGuard(new Reflector()));

  // ✅ Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Mentor Grading API')
    .setDescription(
      'APIs for mentors to grade student assignments and provide feedback. Admin API for course management.'
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
