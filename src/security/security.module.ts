import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SecurityMiddleware } from './security.service';
import { CsrfMiddleware } from './csrf.service';
import { SecurityController } from './controllers/security.controller';
import { SecurityService as ValidationService } from './services/security-validation.service';
import { SecurityHeaders } from './SecurityHeaders';
import { CSPManager } from './CSPManager';
import { SecurityScanner } from './SecurityScanner';
import { SecurityService } from '../services/SecurityService';

@Module({
  imports: [ConfigModule],
  controllers: [SecurityController],
  providers: [
    ValidationService,
    SecurityHeaders,
    CSPManager,
    SecurityScanner,
    SecurityService,
  ],
  exports: [ValidationService, SecurityService],
})
export class SecurityModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply security middleware to all routes
    consumer.apply(SecurityMiddleware).forRoutes('*');

    // Apply CSRF middleware to state-changing routes
    consumer.apply(CsrfMiddleware).forRoutes('*');
  }
}
