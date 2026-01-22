import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { RolesGuard } from './role/roles.guard';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import compress from '@fastify/compress';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import fastifyHelmet from '@fastify/helmet';
import fastifyCsrf from '@fastify/csrf-protection';
import { setupTracing } from './monitoring/tracing.bootstrap';

async function bootstrap() {
  await setupTracing();

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  // --- REQUIREMENT #471: API Versioning (URI Strategy) ---
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Fastify Middlewares
  await app.register(compress, { threshold: 1024, global: true });
  await app.register(fastifyHelmet);
  await app.register(fastifyCsrf);

  // Global Validation
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }));

  // Global Guards
  app.useGlobalGuards(new RolesGuard(new Reflector()));

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('StrellerMinds API')
    .setDescription('Standardized API with Versioning and Uniform Responses.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 API Standardized & Versioned at: http://localhost:${port}/v1`);
}
bootstrap();