import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityIncident } from './security-incident.entity';
import { ThreatDetectionService } from './threat-detection.service';
import { SecurityResponseService } from './security-response.service';
import { SecurityAnalyticsService } from './security-analytics.service';
import { SecurityAudit } from '../auth/entities/security-audit.entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([SecurityIncident, SecurityAudit]),
  ],
  providers: [
    ThreatDetectionService,
    SecurityResponseService,
    SecurityAnalyticsService,
  ],
  exports: [
    ThreatDetectionService,
    SecurityResponseService,
    SecurityAnalyticsService,
  ],
})
export class SecurityModule {}