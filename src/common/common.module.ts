import { Module, Global } from '@nestjs/common';
import { SharedUtilityService } from './services/shared-utility.service';
import { DependencyInjectionService } from './services/dependency-injection.service';

@Global()
@Module({
  providers: [
    SharedUtilityService,
    DependencyInjectionService,
  ],
  exports: [
    SharedUtilityService,
    DependencyInjectionService,
  ],
})
export class CommonModule {}
