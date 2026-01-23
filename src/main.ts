import { NestFactory } from '@nestjs/core';
import helmet from 'helmet'; 
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // --- Task 474: Implementation Start ---
  
  // Basic Helmet setup
  app.use(helmet());

  // Strict CSP (Optional but recommended for high security)
  app.use(
    helmet.contentSecurityPolicy({
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    }),
  );

  // --- Task 474: Implementation End ---

  await app.listen(3000);
}
bootstrap();