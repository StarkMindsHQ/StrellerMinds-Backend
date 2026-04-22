import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
