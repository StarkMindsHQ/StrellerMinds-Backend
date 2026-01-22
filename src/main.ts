import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { RolesGuard } from './role/roles.guard';
import { GlobalExceptionsFilter } from './common/filters/global-exception.filter';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe, VersioningType } from '@nestjs/common'; 
import compress from '@fastify/compress';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import fastifyHelmet from '@fastify/helmet';
import fastifyCsrf from '@fastify/csrf-protection';

import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { setupTracing } from './monitoring/tracing.bootstrap';

async function bootstrap() {
  // Start OpenTelemetry tracing
  await setupTracing();

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  // 1. IMPLEMENT API VERSIONING (Requirement: Versioning Strategy)
  // This ensures all routes start with /v1/ (e.g., http://localhost:3000/v1/auth)
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'v',
  });

  // 2. REGISTER GLOBAL INTERCEPTOR (Requirement: Response Standardization)
  // This wraps every successful response in { success: true, message: "...", data: [...] }
  app.useGlobalInterceptors(new TransformInterceptor());

  // Performance: Compression
  await app.register(compress, { 
    threshold: 1024,
    global: true,
    encodings: ['gzip', 'deflate', 'br'],
  });

  // Security: Helmet and CSRF
  await app.register(fastifyHelmet);
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
  // Wrapped in try-catch to prevent startup crash if services are missing in AppModule
  try {
    const i18n = app.get('I18nService');
    const loggerService = app.get('LoggerService');
    const sentryService = app.get('SentryService');
    const alertingService = app.get('AlertingService');
    const errorDashboardService = app.get('ErrorDashboardService');
    
    app.useGlobalFilters(new GlobalExceptionsFilter(
      i18n,
      loggerService,
      sentryService,
      alertingService,
      errorDashboardService
    ));
  } catch (error) {
    console.warn('Note: Global logging/filter services not fully loaded. Running with standard error handling.');
  }
  
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

  // Start the server
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port, '0.0.0.0');
  
  console.log(`
  🚀 Application is running on: http://localhost:${port}/v1
  📖 Swagger Documentation: http://localhost:${port}/api
  `);
}

bootstrap();