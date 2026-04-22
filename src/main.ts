import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { OpenAPIValidationMiddleware } from './common/contract-testing/openapi-validation.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Apply OpenAPI validation middleware globally
  const openApiValidation = app.get(OpenAPIValidationMiddleware);
  app.use(openApiValidation);
  
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
