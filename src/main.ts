import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import compression from 'compression';
import { OpenAPIValidationMiddleware } from './common/contract-testing/openapi-validation.middleware';
import { SecureLoggingInterceptor } from './common/secure-logging/secure-logging.interceptor';
import { CsrfGuard } from './auth/guards/csrf.guard';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Disable default NestJS logger to use our secure logger
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Issue #801: Enable gzip/brotli compression for API responses
  app.use(compression());

  // Issue #728: Enforce HTTPS in production
  // Use helmet to set security headers and redirect HTTP to HTTPS
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    app.use(
      helmet({
        hsts: {
          maxAge: 31536000, // 1 year in seconds
          includeSubDomains: true,
          preload: true,
        },
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
          },
        },
      }),
    );

    // Redirect HTTP to HTTPS
    app.use((req, res, next) => {
      if (!req.secure && req.protocol === 'http') {
        return res.redirect(301, `https://${req.headers.host}${req.url}`);
      }
      next();
    });
  } else {
    // In development, use helmet without HSTS to allow HTTP
    app.use(helmet({ contentSecurityPolicy: false }));
  }

  // Issue #730: Implement proper CORS configuration
  // Only allow specific trusted origins in production
  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:3000']; // Default for development

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    exposedHeaders: ['X-Total-Count', 'X-Next-Cursor'],
    maxAge: 86400, // 24 hours
  });

  // Issue #731: Add request body size limits to prevent DoS attacks
  // Max 10MB for regular requests, can be overridden via environment variable
  const maxRequestSize = process.env.MAX_REQUEST_SIZE || '10mb';

  // Get the underlying Express instance and apply body size limits
  const httpAdapter = app.getHttpAdapter();
  const expressInstance = httpAdapter.getInstance();
  expressInstance.use(expressInstance.json({ limit: maxRequestSize }));
  expressInstance.use(expressInstance.urlencoded({ limit: maxRequestSize, extended: true }));

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
