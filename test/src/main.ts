import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { RolesGuard } from './role/roles.guard';
import { GlobalExceptionsFilter } from './common/filters/global-exception.filter';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import compress from '@fastify/compress';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import fastifyHelmet from '@fastify/helmet';
import fastifyCsrf from '@fastify/csrf-protection';


async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  // Register compression
  await app.register(compress, {
    threshold: 1024, // Only compress if response > 1KB
    global: true,
    encodings: ['gzip', 'deflate', 'br'],
  });

  // Register Helmet for security headers
  await app.register(fastifyHelmet);

  // Register CSRF protection globally
  await app.register(fastifyCsrf);

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Global exception and role guards
  const i18n = app.get('I18nService');
  app.useGlobalFilters(new GlobalExceptionsFilter(i18n));
  app.useGlobalGuards(new RolesGuard(new Reflector()));

  // Swagger setup
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

  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3000);
}

bootstrap();
