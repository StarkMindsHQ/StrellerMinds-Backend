import { Module, Global } from '@nestjs/common';
import { SharedUtilityService } from './services/shared-utility.service';
import { DependencyInjectionService } from './services/dependency-injection.service';
import { CorrelationIdMiddleware } from './middleware/correlation-id.middleware';
import { LoggerService } from './logging/logger.service';

@Global()
@Module({
  providers: [
    SharedUtilityService,
    DependencyInjectionService,
    LoggerService,
    CorrelationIdMiddleware,
  ],
  exports: [
    SharedUtilityService,
    DependencyInjectionService,
    LoggerService,
    CorrelationIdMiddleware,
  ],
})
export class CommonModule {}
