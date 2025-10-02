// Initialize tracing before any other imports
import { initTracing } from './tracing';
initTracing();

import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { RolesGuard } from './role/roles.guard';
import { GlobalExceptionsFilter } from './common/filters/global-exception.filter';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import compress from '@fastify/compress';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import fastifyHelmet from '@fastify/helmet';
import fastifyCsrf from '@fastify/csrf-protection';
import { FastifyRequest } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import request from 'request';
import multipart from '@fastify/multipart';

import { setupTracing } from './monitoring/tracing.bootstrap';

async function bootstrap() {
  await setupTracing();

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());

  // Register compression
  await app.register(compress, {
    threshold: 1024, // Only compress if response > 1KB
    global: true,
    encodings: ['gzip', 'deflate', 'br'],
  });

  // Register Helmet for security headers
  //await app.register(fastifyHelmet);

  await app.register(fastifyHelmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
  });

  const allowedOrigins = process.env.CORS_ORIGINS?.split(',') ?? [];
  app.enableCors({
    origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
      if (!origin || allowedOrigins.includes(origin)) cb(null, true);
      else cb(new Error('Not allowed by CORS'), false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });
  // Rate limiting
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (req: FastifyRequest) => {
      const user = (req as any).user;
      return user?.id ?? req.ip;
    },
    errorResponseBuilder: () => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
    }),
  });

  // Register CSRF protection globally
  await app.register(fastifyCsrf);

  // Register multipart for file uploads
  await app.register(multipart, {
    limits: {
      fileSize: 20 * 1024 * 1024, // 20MB per file
      files: 1,
    },
  });

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
  const loggerService = app.get('LoggerService');
  const sentryService = app.get('SentryService');
  const alertingService = app.get('AlertingService');
  const errorDashboardService = app.get('ErrorDashboardService');
  app.useGlobalFilters(
    new GlobalExceptionsFilter(
      i18n,
      loggerService,
      sentryService,
      alertingService,
      errorDashboardService,
    ),
  );
  app.useGlobalGuards(new RolesGuard(new Reflector()));

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Mentor Grading API')
    .setDescription(
      'APIs for mentors to grade student assignments and provide feedback. Admin API for course management.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3000);
}

bootstrap();
