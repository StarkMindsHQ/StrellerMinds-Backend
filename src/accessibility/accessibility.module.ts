import { Module } from '@nestjs/common';
import { AccessibilityService } from './services/accessibility.service';
import { AccessibilityController } from './controllers/accessibility.controller';
import { AccessibilityTestingService } from './services/accessibility-testing.service';
import { RTLService } from './services/rtl.service';

@Module({
  providers: [AccessibilityService, AccessibilityTestingService, RTLService],
  controllers: [AccessibilityController],
  exports: [AccessibilityService, AccessibilityTestingService, RTLService],
})
export class AccessibilityModule {}
