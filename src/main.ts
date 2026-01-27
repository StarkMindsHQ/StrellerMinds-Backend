import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { ValidationException } from './common/decorators/errors/validation-exception';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { applyGlobalSecurity } from './common/security/bootstrap';
import { WinstonModule } from 'nest-winston';
import { winstonConfig } from './logging/winston.config';
import { SECURITY_CONFIG } from './security/security.config';
import * as Sentry from '@sentry/node';

async function bootstrap() {
  // Sentry should initialize as early as possible.
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 1.0,
  });

  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger(winstonConfig),
  });

  // Enhanced security headers with custom configuration
  app.use(helmet(SECURITY_CONFIG.securityHeaders as any));

  // Global input security + validation (centralized)
  applyGlobalSecurity(app);

    app.useGlobalFilters(new AllExceptionsFilter());

  // CORS configuration
  // app.enableCors({
  //   origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  //   credentials: true,
  //   methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  //   allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  // });
  // Enhanced CORS configuration
  app.enableCors(SECURITY_CONFIG.cors);

  // Trust proxy for rate limiting and IP detection
  (app as any).set('trust proxy', 1);

  // API prefix
  app.setGlobalPrefix('api');

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('StrellerMinds Backend API')
    .setDescription('A comprehensive blockchain education platform backend with enterprise-grade security')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'X-API-Key', in: 'header' })
    .addTag('Authentication')
    .addTag('Users')
    .addTag('Courses')
    .addTag('Blockchain')
    .addTag('Security')
    .addServer('http://localhost:3000', 'Development Server')
    .addServer('https://api.strellerminds.com', 'Production Server')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'StrellerMinds API Documentation',
    customfavIcon: '/favicon.ico',
  });

  // Enable graceful shutdown
  app.enableShutdownHooks();

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  console.log(`🔒 Security Endpoints: http://localhost:${port}/api/security`);
}
bootstrap();
