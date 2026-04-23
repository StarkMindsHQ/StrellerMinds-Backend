import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { AppModule } from './app.module';
import { OpenAPIValidationMiddleware } from './common/contract-testing/openapi-validation.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Minimal logic to enable URI-based versioning
  app.enableVersioning({
    // type: VersioningType.URI,
    defaultVersion: '1', 
  });
  // Apply OpenAPI validation middleware globally
  const openApiValidation = app.get(OpenAPIValidationMiddleware);
  app.use(openApiValidation);

  // Enable cookie parsing via NestJS/Express
  // Cookies are automatically parsed and available on Request.cookies
  // No additional middleware needed - Express handles it by default

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

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
