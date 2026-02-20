import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SecurityMiddleware } from './security.service';
import { CsrfMiddleware } from './csrf.service';
import { SecurityController } from './controllers/security.controller';
import { SecurityService } from './services/security-validation.service';

@Module({
  imports: [ConfigModule],
  controllers: [SecurityController],
  providers: [SecurityService],
  exports: [SecurityService],
})
export class SecurityModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply security middleware to all routes
    consumer.apply(SecurityMiddleware).forRoutes('*');

    // Apply CSRF middleware to state-changing routes
    consumer.apply(CsrfMiddleware).forRoutes('*');
  }
}
