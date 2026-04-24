import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { OpenAPIValidationMiddleware } from './common/contract-testing/openapi-validation.middleware';
import { SecureLoggingInterceptor } from './common/secure-logging/secure-logging.interceptor';
import { CsrfGuard } from './auth/guards/csrf.guard';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Disable default NestJS logger to use our secure logger
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Apply secure logging interceptor globally
  app.useGlobalInterceptors(new SecureLoggingInterceptor());

  // Minimal logic to enable URI-based versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
  // Apply OpenAPI validation middleware globally
  const openApiValidation = app.get(OpenAPIValidationMiddleware);
  app.use(openApiValidation);

  // Enable cookie parsing
  app.use(cookieParser());

  // Global validation pipe with comprehensive error handling
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Remove properties that are not in the DTO
      forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are provided
      transform: true, // Automatically transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true, // Enable implicit type conversion
      },
      skipMissingProperties: false, // Validate missing properties
      errorHttpStatusCode: 400, // Return 400 for validation errors
    }),
  );

  // Apply CSRF protection globally for all state-changing operations
  app.useGlobalGuards(new CsrfGuard());

  // Apply global exception filter for consistent error responses
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Enable graceful shutdown hooks to handle SIGTERM, SIGINT, etc.
  app.enableShutdownHooks();

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
