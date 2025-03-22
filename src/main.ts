import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { RolesGuard } from './role/roles.guard';
import { GlobalExceptionsFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalGuards(new RolesGuard(new Reflector()));

  // Use the exception filter globally
  app.useGlobalFilters(new GlobalExceptionsFilter());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
