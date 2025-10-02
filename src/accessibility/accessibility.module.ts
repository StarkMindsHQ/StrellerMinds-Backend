import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AccessibilityService } from './services/accessibility.service';
import { AccessibilityMetadataService } from './services/accessibility-metadata.service';
import { AccessibilityComplianceService } from './services/accessibility-compliance.service';
import { AccessibilityLoggingService } from './services/accessibility-logging.service';

import { AccessibilityController } from './controllers/accessibility.controller';

import { AccessibilityMetadata } from './entities/accessibility-metadata.entity';
import { AccessibilityLog } from './entities/accessibility-log.entity';
import { ContentLabel } from './entities/content-label.entity';

import { AccessibilityMiddleware } from './middleware/accessibility.middleware';
import { AccessibilityInterceptor } from './interceptors/accessibility.interceptor';

@Module({
  imports: [TypeOrmModule.forFeature([AccessibilityMetadata, AccessibilityLog, ContentLabel])],
  providers: [
    AccessibilityService,
    AccessibilityMetadataService,
    AccessibilityComplianceService,
    AccessibilityLoggingService,
    AccessibilityMiddleware,
    AccessibilityInterceptor,
  ],
  controllers: [AccessibilityController],
  exports: [
    AccessibilityService,
    AccessibilityMetadataService,
    AccessibilityComplianceService,
    AccessibilityLoggingService,
  ],
})
export class AccessibilityModule {}
