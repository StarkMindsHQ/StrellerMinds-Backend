import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { applyGlobalSecurity } from './common/security/bootstrap';
import { WinstonModule } from 'nest-winston';
import { winstonConfig } from './logging/winston.config';
import { SECURITY_CONFIG } from './security/security.config';
import * as Sentry from '@sentry/node';
import { Logger } from 'winston';
import { PerformanceInterceptor } from './common/interceptors/performance.interceptor';

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

  app.useGlobalInterceptors(new PerformanceInterceptor());
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
    .setDescription(
      `
    ## Overview
    A comprehensive blockchain education platform backend with enterprise-grade security, scalability, and performance.
    
    ## Features
    - 🔐 **Enterprise Security**: Multi-layer authentication, rate limiting, and encryption
    - 📚 **Educational Content**: Course management, learning paths, and progress tracking
    - 💰 **Payment Integration**: Stripe integration with subscription management
    - 🔍 **Search & Discovery**: Advanced search with Elasticsearch
    - 📊 **Analytics**: Comprehensive metrics and monitoring
    - 🌍 **Internationalization**: Multi-language support and accessibility
    - 🎮 **Gamification**: Points, badges, and achievement system
    
    ## Authentication
    The API uses multiple authentication methods:
    - **Bearer Token**: JWT-based authentication for users
    - **API Key**: Service-to-service authentication
    - **OAuth**: Integration with external providers
    
    ## Rate Limiting
    All endpoints are rate-limited to prevent abuse. Limits vary by endpoint and user tier.
    
    ## Error Handling
    The API returns consistent error responses with detailed information for debugging.
    
    ## Versioning
    Current version: v1.0.0
    
    ## Support
    For API support, contact: api-support@strellerminds.com
    `,
    )
    .setVersion('1.0.0')
    .setContact(
      'StrellerMinds API Support',
      'https://strellerminds.com/support',
      'api-support@strellerminds.com',
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'bearer',
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'X-API-Key',
        in: 'header',
        description: 'Enter API key for service-to-service authentication',
      },
      'api_key',
    )
    .addBasicAuth(
      {
        type: 'http',
        scheme: 'basic',
        description: 'Basic authentication for admin endpoints',
      },
      'basic',
    )
    .addOAuth2(
      {
        type: 'oauth2',
        flows: {
          authorizationCode: {
            authorizationUrl: 'https://strellerminds.com/oauth/authorize',
            tokenUrl: 'https://strellerminds.com/oauth/token',
            scopes: {
              read: 'Read access to resources',
              write: 'Write access to resources',
              admin: 'Administrative access',
            },
          },
        },
      },
      'oauth2',
    )
    .addServer('http://localhost:3000', 'Development Server')
    .addServer('https://api-staging.strellerminds.com', 'Staging Server')
    .addServer('https://api.strellerminds.com', 'Production Server')
    .addTag('Authentication', 'User authentication and authorization')
    .addTag('Users', 'User management and profiles')
    .addTag('Courses', 'Course content and management')
    .addTag('Blockchain', 'Blockchain integration and Stellar operations')
    .addTag('Security', 'Security monitoring and compliance')
    .addTag('Payments', 'Payment processing and subscriptions')
    .addTag('Files', 'File upload and management')
    .addTag('Search', 'Search and discovery')
    .addTag('Notifications', 'Push notifications and messaging')
    .addTag('Analytics', 'Metrics and analytics')
    .addTag('Health', 'System health and monitoring')
    .addTag('Gamification', 'Points, badges, and achievements')
    .addTag('Learning Paths', 'Educational learning paths')
    .addTag('Assignments', 'Course assignments and submissions')
    .addTag('Forum', 'Discussion forums and community')
    .addTag('Video', 'Video processing and streaming')
    .addTag('Integrations', 'Third-party integrations')
    .addTag('Accessibility', 'WCAG 2.1 AA compliance, screen reader optimization, keyboard navigation, and accessibility monitoring')
    .addTag('Developer Portal', 'API keys, SDKs, analytics, and developer tools')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
    deepScanRoutes: true,
  });

  // Enhanced Swagger UI setup
  SwaggerModule.setup('api/docs', app, document, {
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 20px 0 }
      .swagger-ui .scheme-container { margin: 20px 0 }
      .swagger-ui .opblock.opblock-post { border-color: #49cc90 }
      .swagger-ui .opblock.opblock-get { border-color: #61affe }
      .swagger-ui .opblock.opblock-put { border-color: #fca130 }
      .swagger-ui .opblock.opblock-delete { border-color: #f93e3e }
      .swagger-ui .opblock.opblock-patch { border-color: #50e3c2 }
      .swagger-ui .btn.authorize { background-color: #4CAF50; border-color: #4CAF50; }
      .swagger-ui .info .title { color: #3b82f6; }
    `,
    customSiteTitle: 'StrellerMinds API Documentation & Developer Portal',
    customfavIcon: '/favicon.ico',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      docExpansion: 'list',
      defaultModelsExpandDepth: 3,
      defaultModelExpandDepth: 3,
      displayOperationId: true,
      tryItOutEnabled: true,
      requestSnippetsEnabled: true,
      requestSnippets: {
        generators: {
          'curl_bash': {
            title: 'cURL (bash)',
          },
          'curl_powershell': {
            title: 'cURL (PowerShell)',
          },
          'javascript': {
            title: 'JavaScript',
          },
          'python': {
            title: 'Python',
          },
        },
      },
    },
    customJs: [
      'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js',
    ],
  });

  // Additional OpenAPI JSON endpoint with versioning
  app.getHttpAdapter().get('/api/docs-json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(document);
  });

  // OpenAPI YAML endpoint (optional - requires js-yaml package)
  try {
    const yaml = require('js-yaml');
    app.getHttpAdapter().get('/api/docs-yaml', (req, res) => {
      res.setHeader('Content-Type', 'text/yaml');
      res.send(yaml.dump(document));
    });
  } catch (error) {
    // YAML endpoint not available if js-yaml is not installed
    const logger = app.get(Logger);
    logger.warn('YAML endpoint not available - install js-yaml package to enable');
  }

  // Enable graceful shutdown
  app.enableShutdownHooks();

  const port = process.env.PORT || 3000;
  await app.listen(port);

  const logger = app.get(Logger);
  logger.info(`🚀 Server running on http://localhost:${port}`, 'Bootstrap');
  logger.info(`📚 API Documentation: http://localhost:${port}/api/docs`, 'Bootstrap');
  logger.info(`🔒 Security Endpoints: http://localhost:${port}/api/security`, 'Bootstrap');
}
bootstrap();
