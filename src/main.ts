import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { winstonConfig } from './logging/winston.config';
import * as Sentry from '@sentry/node';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger(winstonConfig),
  });

  .addBearerAuth()
    .addTag('Authentication')
    .addTag('Users')
    .addTag('Courses')
    .addTag('Blockchain')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  // Sentry
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 1.0,
  });

  // Security Headers
  app.use(helmet());

  // CORS
  app.enableCors({
    origin: ['https://your-frontend.com'],
    methods: 'GET,POST,PUT,DELETE',
    credentials: true,
  });

  // Input Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(3000);
}
bootstrap();
