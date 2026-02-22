import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessibilityService } from './services/accessibility.service';
import { AccessibilityController } from './controllers/accessibility.controller';
import { AccessibilityTestingService } from './services/accessibility-testing.service';
import { AccessibilityMonitoringService } from './services/accessibility-monitoring.service';
import { RTLService } from './services/rtl.service';
import { AccessibilityAudit } from './entities/accessibility-audit.entity';
import { AccessibilityViolation } from './entities/accessibility-violation.entity';
import { User } from '../auth/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AccessibilityAudit, AccessibilityViolation, User])],
  providers: [
    AccessibilityService,
    AccessibilityTestingService,
    AccessibilityMonitoringService,
    RTLService,
  ],
  controllers: [AccessibilityController],
  exports: [
    AccessibilityService,
    AccessibilityTestingService,
    AccessibilityMonitoringService,
    RTLService,
  ],
})
export class AccessibilityModule {}
